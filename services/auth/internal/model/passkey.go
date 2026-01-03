package model

import (
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// PasskeyCredential represents a stored WebAuthn credential
type PasskeyCredential struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	CredentialID    []byte     `json:"-"`
	PublicKey       []byte     `json:"-"`
	AttestationType string     `json:"attestation_type,omitempty"`
	AAGUID          []byte     `json:"-"`
	SignCount       uint32     `json:"sign_count"`
	Name            string     `json:"name"`
	CreatedAt       time.Time  `json:"created_at"`
	LastUsedAt      *time.Time `json:"last_used_at,omitempty"`
}

// WebAuthnChallenge stores temporary challenge data
type WebAuthnChallenge struct {
	ID        uuid.UUID
	UserID    *uuid.UUID
	Challenge string // Changed to string to match webauthn library
	Type      string // "registration" or "authentication"
	CreatedAt time.Time
	ExpiresAt time.Time
}

// WebAuthnUser implements webauthn.User interface
type WebAuthnUser struct {
	ID          uuid.UUID
	Email       string
	Credentials []webauthn.Credential
}

func (u *WebAuthnUser) WebAuthnID() []byte {
	return u.ID[:]
}

func (u *WebAuthnUser) WebAuthnName() string {
	return u.Email
}

func (u *WebAuthnUser) WebAuthnDisplayName() string {
	return u.Email
}

func (u *WebAuthnUser) WebAuthnCredentials() []webauthn.Credential {
	return u.Credentials
}

func (u *WebAuthnUser) WebAuthnIcon() string {
	return ""
}

// Request/Response types
type BeginPasskeyRegistrationRequest struct {
	Name string `json:"name" validate:"required,max=100"`
}

type FinishPasskeyRegistrationRequest struct {
	Name     string `json:"name" validate:"required,max=100"`
	Response string `json:"response" validate:"required"` // Base64 encoded attestation response
}

type BeginPasskeyLoginRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type FinishPasskeyLoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Response string `json:"response" validate:"required"` // Base64 encoded assertion response
}

type PasskeyCredentialResponse struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	CreatedAt time.Time  `json:"created_at"`
	LastUsed  *time.Time `json:"last_used,omitempty"`
}
