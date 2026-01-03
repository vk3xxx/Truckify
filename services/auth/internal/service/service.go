package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"truckify/services/auth/internal/model"
	"truckify/services/auth/internal/repository"
	"truckify/shared/pkg/jwt"
	"truckify/shared/pkg/logger"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotActive      = errors.New("user account is not active")
)

// RepositoryInterface defines the interface for repository operations
type RepositoryInterface interface {
	CreateUser(ctx context.Context, user *model.User) error
	GetUserByEmail(ctx context.Context, email string) (*model.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	UpdateLastLogin(ctx context.Context, userID uuid.UUID) error
	UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error
	VerifyEmail(ctx context.Context, token string) error
	SetResetToken(ctx context.Context, email, token string, expiry time.Time) error
	ResetPassword(ctx context.Context, token, passwordHash string) error
	// Passkey methods
	SavePasskeyCredential(ctx context.Context, cred *model.PasskeyCredential) error
	GetPasskeyCredentialsByUserID(ctx context.Context, userID uuid.UUID) ([]webauthn.Credential, error)
	UpdatePasskeySignCount(ctx context.Context, credentialID []byte, signCount uint32) error
	GetUserPasskeys(ctx context.Context, userID uuid.UUID) ([]model.PasskeyCredential, error)
	DeletePasskey(ctx context.Context, userID, passkeyID uuid.UUID) error
	SaveChallenge(ctx context.Context, ch *model.WebAuthnChallenge) error
	GetChallenge(ctx context.Context, userID *uuid.UUID, challengeType string) (*model.WebAuthnChallenge, error)
	DeleteChallenge(ctx context.Context, id uuid.UUID) error
	// Admin methods
	ListUsers(ctx context.Context) ([]model.User, error)
	UpdateUserStatus(ctx context.Context, userID uuid.UUID, status string) error
}

// Service handles auth business logic
type Service struct {
	repo       RepositoryInterface
	jwtManager *jwt.JWTManager
	webauthn   *webauthn.WebAuthn
	logger     *logger.Logger
}

// New creates a new auth service
func New(repo RepositoryInterface, jwtManager *jwt.JWTManager, logger *logger.Logger) *Service {
	return &Service{
		repo:       repo,
		jwtManager: jwtManager,
		logger:     logger,
	}
}

// NewWithWebAuthn creates a new auth service with WebAuthn support
func NewWithWebAuthn(repo RepositoryInterface, jwtManager *jwt.JWTManager, webauthn *webauthn.WebAuthn, logger *logger.Logger) *Service {
	return &Service{
		repo:       repo,
		jwtManager: jwtManager,
		webauthn:   webauthn,
		logger:     logger,
	}
}

// Register registers a new user
func (s *Service) Register(ctx context.Context, req *model.RegisterRequest) (*model.LoginResponse, error) {
	// Check if email already exists
	existingUser, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil && err != repository.ErrUserNotFound {
		return nil, err
	}
	if existingUser != nil {
		return nil, repository.ErrEmailAlreadyExists
	}

	// Hash password
	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Generate verification token
	verificationToken, err := generateToken()
	if err != nil {
		return nil, err
	}

	// Create user
	user := &model.User{
		ID:                uuid.New(),
		Email:             req.Email,
		PasswordHash:      passwordHash,
		UserType:          req.UserType,
		Status:            model.UserStatusActive,
		EmailVerified:     false,
		VerificationToken: &verificationToken,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	s.logger.Info("User registered", "user_id", user.ID, "email", user.Email)

	// TODO: Send verification email

	// Generate JWT tokens
	tokens, err := s.jwtManager.GenerateTokenPair(user.ID.String(), user.Email, string(user.UserType))
	if err != nil {
		return nil, err
	}

	return &model.LoginResponse{
		User:         user.ToUserResponse(),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresIn:    tokens.ExpiresIn,
	}, nil
}

// Login authenticates a user and returns tokens
func (s *Service) Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error) {
	// Get user by email
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if err == repository.ErrUserNotFound {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Check if user is active
	if user.Status != model.UserStatusActive {
		return nil, ErrUserNotActive
	}

	// Update last login
	if err := s.repo.UpdateLastLogin(ctx, user.ID); err != nil {
		s.logger.Error("Failed to update last login", "user_id", user.ID, "error", err)
	}

	s.logger.Info("User logged in", "user_id", user.ID, "email", user.Email)

	// Generate JWT tokens
	tokens, err := s.jwtManager.GenerateTokenPair(user.ID.String(), user.Email, string(user.UserType))
	if err != nil {
		return nil, err
	}

	return &model.LoginResponse{
		User:         user.ToUserResponse(),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresIn:    tokens.ExpiresIn,
	}, nil
}

// RefreshToken refreshes an access token
func (s *Service) RefreshToken(ctx context.Context, refreshToken string) (*jwt.TokenPair, error) {
	// Validate refresh token
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return nil, err
	}

	// Get user to ensure they still exist and are active
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, errors.New("invalid user ID in token")
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user.Status != model.UserStatusActive {
		return nil, ErrUserNotActive
	}

	// Generate new token pair
	tokens, err := s.jwtManager.GenerateTokenPair(user.ID.String(), user.Email, string(user.UserType))
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

// ChangePassword changes a user's password
func (s *Service) ChangePassword(ctx context.Context, userID uuid.UUID, req *model.ChangePasswordRequest) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("invalid old password")
	}

	// Hash new password
	newPasswordHash, err := hashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	// Update password
	if err := s.repo.UpdatePassword(ctx, userID, newPasswordHash); err != nil {
		return err
	}

	s.logger.Info("Password changed", "user_id", userID)

	return nil
}

// ForgotPassword initiates the password reset process
func (s *Service) ForgotPassword(ctx context.Context, req *model.ForgotPasswordRequest) error {
	// Check if user exists
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// Don't reveal if email exists
		if err == repository.ErrUserNotFound {
			return nil
		}
		return err
	}

	// Generate reset token
	resetToken, err := generateToken()
	if err != nil {
		return err
	}

	// Set token expiry (1 hour)
	expiry := time.Now().Add(1 * time.Hour)

	if err := s.repo.SetResetToken(ctx, user.Email, resetToken, expiry); err != nil {
		return err
	}

	s.logger.Info("Password reset requested", "user_id", user.ID, "email", user.Email)

	// TODO: Send password reset email

	return nil
}

// ResetPassword resets a user's password using a reset token
func (s *Service) ResetPassword(ctx context.Context, req *model.ResetPasswordRequest) error {
	// Hash new password
	newPasswordHash, err := hashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	// Reset password
	if err := s.repo.ResetPassword(ctx, req.Token, newPasswordHash); err != nil {
		return err
	}

	s.logger.Info("Password reset completed")

	return nil
}

// VerifyEmail verifies a user's email
func (s *Service) VerifyEmail(ctx context.Context, req *model.VerifyEmailRequest) error {
	if err := s.repo.VerifyEmail(ctx, req.Token); err != nil {
		return err
	}

	s.logger.Info("Email verified")

	return nil
}

// hashPassword hashes a password using bcrypt
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// generateToken generates a random token
func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// ListUsers returns all users (admin only)
func (s *Service) ListUsers(ctx context.Context) ([]model.User, error) {
	return s.repo.ListUsers(ctx)
}

// UpdateUserStatus updates a user's status (admin only)
func (s *Service) UpdateUserStatus(ctx context.Context, userID uuid.UUID, status string) error {
	return s.repo.UpdateUserStatus(ctx, userID, status)
}
