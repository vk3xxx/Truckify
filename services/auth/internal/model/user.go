package model

import (
	"time"

	"github.com/google/uuid"
)

// UserType represents the type of user
type UserType string

const (
	UserTypeShipper    UserType = "shipper"
	UserTypeDriver     UserType = "driver"
	UserTypeFleet      UserType = "fleet_operator"
	UserTypeDispatcher UserType = "dispatcher"
)

// UserStatus represents the status of a user account
type UserStatus string

const (
	UserStatusActive    UserStatus = "active"
	UserStatusSuspended UserStatus = "suspended"
	UserStatusBlocked   UserStatus = "blocked"
)

// User represents a user in the system
type User struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	Email          string     `db:"email" json:"email"`
	PasswordHash   string     `db:"password_hash" json:"-"`
	UserType       UserType   `db:"user_type" json:"user_type"`
	Status         UserStatus `db:"status" json:"status"`
	EmailVerified  bool       `db:"email_verified" json:"email_verified"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
	LastLoginAt    *time.Time `db:"last_login_at" json:"last_login_at,omitempty"`
	VerificationToken *string `db:"verification_token" json:"-"`
	ResetToken     *string    `db:"reset_token" json:"-"`
	ResetTokenExpiry *time.Time `db:"reset_token_expiry" json:"-"`
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	Email    string   `json:"email" validate:"required,email"`
	Password string   `json:"password" validate:"required,min=8"`
	UserType UserType `json:"user_type" validate:"required,oneof=shipper driver fleet_operator dispatcher"`
}

// LoginRequest represents a user login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	User         *UserResponse `json:"user"`
	AccessToken  string        `json:"access_token"`
	RefreshToken string        `json:"refresh_token"`
	ExpiresIn    int64         `json:"expires_in"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID            uuid.UUID  `json:"id"`
	Email         string     `json:"email"`
	UserType      UserType   `json:"user_type"`
	Status        UserStatus `json:"status"`
	EmailVerified bool       `json:"email_verified"`
	CreatedAt     time.Time  `json:"created_at"`
}

// RefreshTokenRequest represents a token refresh request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// VerifyEmailRequest represents an email verification request
type VerifyEmailRequest struct {
	Token string `json:"token" validate:"required"`
}

// ToUserResponse converts User to UserResponse
func (u *User) ToUserResponse() *UserResponse {
	return &UserResponse{
		ID:            u.ID,
		Email:         u.Email,
		UserType:      u.UserType,
		Status:        u.Status,
		EmailVerified: u.EmailVerified,
		CreatedAt:     u.CreatedAt,
	}
}
