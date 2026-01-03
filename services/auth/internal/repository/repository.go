package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/auth/internal/model"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrEmailAlreadyExists = errors.New("email already exists")
)

// Repository handles database operations for auth
type Repository struct {
	db *sql.DB
}

// New creates a new repository instance
func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateUser creates a new user in the database
func (r *Repository) CreateUser(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, user_type, status, email_verified, created_at, updated_at, verification_token)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.UserType,
		user.Status,
		user.EmailVerified,
		user.CreatedAt,
		user.UpdatedAt,
		user.VerificationToken,
	)

	if err != nil {
		// Check for unique constraint violation (email already exists)
		if err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"` {
			return ErrEmailAlreadyExists
		}
		return err
	}

	return nil
}

// GetUserByEmail retrieves a user by email
func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, user_type, status, email_verified,
		       created_at, updated_at, last_login_at, verification_token, reset_token, reset_token_expiry
		FROM users
		WHERE email = $1
	`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.UserType,
		&user.Status,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
		&user.VerificationToken,
		&user.ResetToken,
		&user.ResetTokenExpiry,
	)

	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// GetUserByID retrieves a user by ID
func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	query := `
		SELECT id, email, password_hash, user_type, status, email_verified,
		       created_at, updated_at, last_login_at, verification_token, reset_token, reset_token_expiry
		FROM users
		WHERE id = $1
	`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.UserType,
		&user.Status,
		&user.EmailVerified,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
		&user.VerificationToken,
		&user.ResetToken,
		&user.ResetTokenExpiry,
	)

	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

// UpdateLastLogin updates the last login timestamp
func (r *Repository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users
		SET last_login_at = $1
		WHERE id = $2
	`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, now, userID)
	return err
}

// UpdatePassword updates the user's password
func (r *Repository) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`

	_, err := r.db.ExecContext(ctx, query, passwordHash, time.Now(), userID)
	return err
}

// VerifyEmail marks the user's email as verified
func (r *Repository) VerifyEmail(ctx context.Context, token string) error {
	query := `
		UPDATE users
		SET email_verified = true, verification_token = NULL, updated_at = $1
		WHERE verification_token = $2
	`

	result, err := r.db.ExecContext(ctx, query, time.Now(), token)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrUserNotFound
	}

	return nil
}

// SetResetToken sets the password reset token
func (r *Repository) SetResetToken(ctx context.Context, email, token string, expiry time.Time) error {
	query := `
		UPDATE users
		SET reset_token = $1, reset_token_expiry = $2, updated_at = $3
		WHERE email = $4
	`

	result, err := r.db.ExecContext(ctx, query, token, expiry, time.Now(), email)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrUserNotFound
	}

	return nil
}

// ResetPassword resets the user's password using a reset token
func (r *Repository) ResetPassword(ctx context.Context, token, passwordHash string) error {
	query := `
		UPDATE users
		SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = $2
		WHERE reset_token = $3 AND reset_token_expiry > $4
	`

	result, err := r.db.ExecContext(ctx, query, passwordHash, time.Now(), token, time.Now())
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.New("invalid or expired reset token")
	}

	return nil
}

// ListUsers returns all users (admin only)
func (r *Repository) ListUsers(ctx context.Context) ([]model.User, error) {
	query := `SELECT id, email, user_type, status, email_verified, created_at, updated_at FROM users ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(&u.ID, &u.Email, &u.UserType, &u.Status, &u.EmailVerified, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

// UpdateUserStatus updates a user's status (admin only)
func (r *Repository) UpdateUserStatus(ctx context.Context, userID uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2", status, userID)
	return err
}
