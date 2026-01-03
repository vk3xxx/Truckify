package repository

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"truckify/services/auth/internal/model"
)

func setupMockDB(t *testing.T) (*sql.DB, sqlmock.Sqlmock, *Repository) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)

	repo := New(db)
	return db, mock, repo
}

func TestCreateUser(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	user := &model.User{
		ID:                uuid.New(),
		Email:             "test@example.com",
		PasswordHash:      "hashedpassword",
		UserType:          model.UserTypeDriver,
		Status:            model.UserStatusActive,
		EmailVerified:     false,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		VerificationToken: stringPtr("token123"),
	}

	mock.ExpectExec("INSERT INTO users").
		WithArgs(user.ID, user.Email, user.PasswordHash, user.UserType, user.Status,
			user.EmailVerified, user.CreatedAt, user.UpdatedAt, user.VerificationToken).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := repo.CreateUser(ctx, user)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateUserDuplicateEmail(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	user := &model.User{
		ID:                uuid.New(),
		Email:             "test@example.com",
		PasswordHash:      "hashedpassword",
		UserType:          model.UserTypeDriver,
		Status:            model.UserStatusActive,
		EmailVerified:     false,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		VerificationToken: stringPtr("token123"),
	}

	mock.ExpectExec("INSERT INTO users").
		WithArgs(user.ID, user.Email, user.PasswordHash, user.UserType, user.Status,
			user.EmailVerified, user.CreatedAt, user.UpdatedAt, user.VerificationToken).
		WillReturnError(sql.ErrNoRows) // Simulate duplicate email error

	err := repo.CreateUser(ctx, user)
	assert.Error(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByEmail(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	userID := uuid.New()
	email := "test@example.com"

	rows := sqlmock.NewRows([]string{
		"id", "email", "password_hash", "user_type", "status", "email_verified",
		"created_at", "updated_at", "last_login_at", "verification_token", "reset_token", "reset_token_expiry",
	}).AddRow(
		userID, email, "hashedpassword", model.UserTypeDriver, model.UserStatusActive, false,
		time.Now(), time.Now(), nil, nil, nil, nil,
	)

	mock.ExpectQuery("SELECT (.+) FROM users WHERE email").
		WithArgs(email).
		WillReturnRows(rows)

	user, err := repo.GetUserByEmail(ctx, email)
	require.NoError(t, err)
	assert.Equal(t, userID, user.ID)
	assert.Equal(t, email, user.Email)
	assert.Equal(t, model.UserTypeDriver, user.UserType)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByEmailNotFound(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	email := "notfound@example.com"

	mock.ExpectQuery("SELECT (.+) FROM users WHERE email").
		WithArgs(email).
		WillReturnError(sql.ErrNoRows)

	user, err := repo.GetUserByEmail(ctx, email)
	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrUserNotFound)
	assert.Nil(t, user)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByID(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	userID := uuid.New()

	rows := sqlmock.NewRows([]string{
		"id", "email", "password_hash", "user_type", "status", "email_verified",
		"created_at", "updated_at", "last_login_at", "verification_token", "reset_token", "reset_token_expiry",
	}).AddRow(
		userID, "test@example.com", "hashedpassword", model.UserTypeDriver, model.UserStatusActive, false,
		time.Now(), time.Now(), nil, nil, nil, nil,
	)

	mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
		WithArgs(userID).
		WillReturnRows(rows)

	user, err := repo.GetUserByID(ctx, userID)
	require.NoError(t, err)
	assert.Equal(t, userID, user.ID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByIDNotFound(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	userID := uuid.New()

	mock.ExpectQuery("SELECT (.+) FROM users WHERE id").
		WithArgs(userID).
		WillReturnError(sql.ErrNoRows)

	user, err := repo.GetUserByID(ctx, userID)
	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrUserNotFound)
	assert.Nil(t, user)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdateLastLogin(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	userID := uuid.New()

	mock.ExpectExec("UPDATE users SET last_login_at").
		WithArgs(sqlmock.AnyArg(), userID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := repo.UpdateLastLogin(ctx, userID)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestUpdatePassword(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	userID := uuid.New()
	newPasswordHash := "newhashpassword"

	mock.ExpectExec("UPDATE users SET password_hash").
		WithArgs(newPasswordHash, sqlmock.AnyArg(), userID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := repo.UpdatePassword(ctx, userID, newPasswordHash)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestVerifyEmail(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	token := "verification-token-123"

	mock.ExpectExec("UPDATE users SET email_verified").
		WithArgs(sqlmock.AnyArg(), token).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := repo.VerifyEmail(ctx, token)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestVerifyEmailTokenNotFound(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	token := "invalid-token"

	mock.ExpectExec("UPDATE users SET email_verified").
		WithArgs(sqlmock.AnyArg(), token).
		WillReturnResult(sqlmock.NewResult(0, 0))

	err := repo.VerifyEmail(ctx, token)
	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrUserNotFound)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSetResetToken(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	email := "test@example.com"
	token := "reset-token-123"
	expiry := time.Now().Add(1 * time.Hour)

	mock.ExpectExec("UPDATE users SET reset_token").
		WithArgs(token, expiry, sqlmock.AnyArg(), email).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := repo.SetResetToken(ctx, email, token, expiry)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSetResetTokenUserNotFound(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	email := "notfound@example.com"
	token := "reset-token-123"
	expiry := time.Now().Add(1 * time.Hour)

	mock.ExpectExec("UPDATE users SET reset_token").
		WithArgs(token, expiry, sqlmock.AnyArg(), email).
		WillReturnResult(sqlmock.NewResult(0, 0))

	err := repo.SetResetToken(ctx, email, token, expiry)
	assert.Error(t, err)
	assert.ErrorIs(t, err, ErrUserNotFound)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestResetPassword(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	token := "reset-token-123"
	newPasswordHash := "newhashpassword"

	mock.ExpectExec("UPDATE users SET password_hash").
		WithArgs(newPasswordHash, sqlmock.AnyArg(), token, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	err := repo.ResetPassword(ctx, token, newPasswordHash)
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestResetPasswordInvalidToken(t *testing.T) {
	db, mock, repo := setupMockDB(t)
	defer db.Close()

	ctx := context.Background()
	token := "invalid-token"
	newPasswordHash := "newhashpassword"

	mock.ExpectExec("UPDATE users SET password_hash").
		WithArgs(newPasswordHash, sqlmock.AnyArg(), token, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 0))

	err := repo.ResetPassword(ctx, token, newPasswordHash)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid or expired")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func stringPtr(s string) *string {
	return &s
}
