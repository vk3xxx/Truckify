package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"truckify/services/auth/internal/model"
)

var (
	ErrPasskeyNotFound    = errors.New("passkey not found")
	ErrInvalidChallenge   = errors.New("invalid or expired challenge")
	ErrNoPasskeysForUser  = errors.New("no passkeys registered for user")
)

// BeginPasskeyRegistration starts the passkey registration process
func (s *Service) BeginPasskeyRegistration(ctx context.Context, userID uuid.UUID) (*protocol.CredentialCreation, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	existingCreds, _ := s.repo.GetPasskeyCredentialsByUserID(ctx, userID)
	webauthnUser := &model.WebAuthnUser{
		ID:          user.ID,
		Email:       user.Email,
		Credentials: existingCreds,
	}

	options, session, err := s.webauthn.BeginRegistration(webauthnUser)
	if err != nil {
		return nil, err
	}

	// Store session challenge
	challenge := &model.WebAuthnChallenge{
		ID:        uuid.New(),
		UserID:    &userID,
		Challenge: session.Challenge,
		Type:      "registration",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := s.repo.SaveChallenge(ctx, challenge); err != nil {
		return nil, err
	}

	return options, nil
}

// FinishPasskeyRegistration completes the passkey registration
func (s *Service) FinishPasskeyRegistration(ctx context.Context, userID uuid.UUID, name, responseData string) (*model.PasskeyCredential, error) {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	challenge, err := s.repo.GetChallenge(ctx, &userID, "registration")
	if err != nil {
		return nil, ErrInvalidChallenge
	}

	existingCreds, _ := s.repo.GetPasskeyCredentialsByUserID(ctx, userID)
	webauthnUser := &model.WebAuthnUser{
		ID:          user.ID,
		Email:       user.Email,
		Credentials: existingCreds,
	}

	// Decode response
	responseBytes, err := base64.StdEncoding.DecodeString(responseData)
	if err != nil {
		return nil, err
	}

	var ccr protocol.CredentialCreationResponse
	if err := json.Unmarshal(responseBytes, &ccr); err != nil {
		return nil, err
	}

	parsedResponse, err := ccr.Parse()
	if err != nil {
		return nil, err
	}

	session := webauthn.SessionData{
		Challenge: challenge.Challenge,
		UserID:    userID[:],
	}

	credential, err := s.webauthn.CreateCredential(webauthnUser, session, parsedResponse)
	if err != nil {
		return nil, err
	}

	// Save credential
	passkeyCredential := &model.PasskeyCredential{
		ID:              uuid.New(),
		UserID:          userID,
		CredentialID:    credential.ID,
		PublicKey:       credential.PublicKey,
		AttestationType: credential.AttestationType,
		AAGUID:          credential.Authenticator.AAGUID[:],
		SignCount:       credential.Authenticator.SignCount,
		Name:            name,
		CreatedAt:       time.Now(),
	}

	if err := s.repo.SavePasskeyCredential(ctx, passkeyCredential); err != nil {
		return nil, err
	}

	// Cleanup challenge
	s.repo.DeleteChallenge(ctx, challenge.ID)

	s.logger.Info("Passkey registered", "user_id", userID, "name", name)
	return passkeyCredential, nil
}

// BeginPasskeyLogin starts the passkey authentication process
func (s *Service) BeginPasskeyLogin(ctx context.Context, email string) (*protocol.CredentialAssertion, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}

	creds, err := s.repo.GetPasskeyCredentialsByUserID(ctx, user.ID)
	if err != nil || len(creds) == 0 {
		return nil, ErrNoPasskeysForUser
	}

	webauthnUser := &model.WebAuthnUser{
		ID:          user.ID,
		Email:       user.Email,
		Credentials: creds,
	}

	options, session, err := s.webauthn.BeginLogin(webauthnUser)
	if err != nil {
		return nil, err
	}

	challenge := &model.WebAuthnChallenge{
		ID:        uuid.New(),
		UserID:    &user.ID,
		Challenge: session.Challenge,
		Type:      "authentication",
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	if err := s.repo.SaveChallenge(ctx, challenge); err != nil {
		return nil, err
	}

	return options, nil
}

// FinishPasskeyLogin completes the passkey authentication
func (s *Service) FinishPasskeyLogin(ctx context.Context, email, responseData string) (*model.LoginResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	if user.Status != model.UserStatusActive {
		return nil, ErrUserNotActive
	}

	challenge, err := s.repo.GetChallenge(ctx, &user.ID, "authentication")
	if err != nil {
		return nil, ErrInvalidChallenge
	}

	creds, _ := s.repo.GetPasskeyCredentialsByUserID(ctx, user.ID)
	webauthnUser := &model.WebAuthnUser{
		ID:          user.ID,
		Email:       user.Email,
		Credentials: creds,
	}

	responseBytes, err := base64.StdEncoding.DecodeString(responseData)
	if err != nil {
		return nil, err
	}

	var car protocol.CredentialAssertionResponse
	if err := json.Unmarshal(responseBytes, &car); err != nil {
		return nil, err
	}

	parsedResponse, err := car.Parse()
	if err != nil {
		return nil, err
	}

	session := webauthn.SessionData{
		Challenge:        challenge.Challenge,
		UserID:           user.ID[:],
		AllowedCredentialIDs: func() [][]byte {
			var ids [][]byte
			for _, c := range creds {
				ids = append(ids, c.ID)
			}
			return ids
		}(),
	}

	credential, err := s.webauthn.ValidateLogin(webauthnUser, session, parsedResponse)
	if err != nil {
		return nil, ErrInvalidCredentials
	}

	// Update sign count
	s.repo.UpdatePasskeySignCount(ctx, credential.ID, credential.Authenticator.SignCount)
	s.repo.DeleteChallenge(ctx, challenge.ID)
	s.repo.UpdateLastLogin(ctx, user.ID)

	tokens, err := s.jwtManager.GenerateTokenPair(user.ID.String(), user.Email, string(user.UserType))
	if err != nil {
		return nil, err
	}

	s.logger.Info("User logged in with passkey", "user_id", user.ID)

	return &model.LoginResponse{
		User:         user.ToUserResponse(),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresIn:    tokens.ExpiresIn,
	}, nil
}

// GetUserPasskeys returns all passkeys for a user
func (s *Service) GetUserPasskeys(ctx context.Context, userID uuid.UUID) ([]model.PasskeyCredential, error) {
	return s.repo.GetUserPasskeys(ctx, userID)
}

// DeletePasskey removes a passkey
func (s *Service) DeletePasskey(ctx context.Context, userID, passkeyID uuid.UUID) error {
	return s.repo.DeletePasskey(ctx, userID, passkeyID)
}
