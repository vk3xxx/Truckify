package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
	"truckify/services/auth/internal/model"
	"truckify/services/auth/internal/repository"
	"truckify/services/auth/internal/service"
	"truckify/shared/pkg/jwt"
	"truckify/shared/pkg/logger"
)

type MockRepository struct {
	mock.Mock
}

func (m *MockRepository) CreateUser(ctx context.Context, user *model.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockRepository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.User), args.Error(1)
}

func (m *MockRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockRepository) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	args := m.Called(ctx, userID, passwordHash)
	return args.Error(0)
}

func (m *MockRepository) VerifyEmail(ctx context.Context, token string) error {
	args := m.Called(ctx, token)
	return args.Error(0)
}

func (m *MockRepository) SetResetToken(ctx context.Context, email, token string, expiry time.Time) error {
	args := m.Called(ctx, email, token, expiry)
	return args.Error(0)
}

func (m *MockRepository) ResetPassword(ctx context.Context, token, passwordHash string) error {
	args := m.Called(ctx, token, passwordHash)
	return args.Error(0)
}

// Passkey methods
func (m *MockRepository) SavePasskeyCredential(ctx context.Context, cred *model.PasskeyCredential) error {
	args := m.Called(ctx, cred)
	return args.Error(0)
}

func (m *MockRepository) GetPasskeyCredentialsByUserID(ctx context.Context, userID uuid.UUID) ([]webauthn.Credential, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]webauthn.Credential), args.Error(1)
}

func (m *MockRepository) UpdatePasskeySignCount(ctx context.Context, credentialID []byte, signCount uint32) error {
	args := m.Called(ctx, credentialID, signCount)
	return args.Error(0)
}

func (m *MockRepository) GetUserPasskeys(ctx context.Context, userID uuid.UUID) ([]model.PasskeyCredential, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.PasskeyCredential), args.Error(1)
}

func (m *MockRepository) DeletePasskey(ctx context.Context, userID, passkeyID uuid.UUID) error {
	args := m.Called(ctx, userID, passkeyID)
	return args.Error(0)
}

func (m *MockRepository) SaveChallenge(ctx context.Context, ch *model.WebAuthnChallenge) error {
	args := m.Called(ctx, ch)
	return args.Error(0)
}

func (m *MockRepository) GetChallenge(ctx context.Context, userID *uuid.UUID, challengeType string) (*model.WebAuthnChallenge, error) {
	args := m.Called(ctx, userID, challengeType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.WebAuthnChallenge), args.Error(1)
}

func (m *MockRepository) DeleteChallenge(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func setupTestService() (*service.Service, *MockRepository) {
	mockRepo := new(MockRepository)
	log := logger.New("test", "debug")
	jwtManager := jwt.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	svc := service.New(mockRepo, jwtManager, log)
	return svc, mockRepo
}

func TestRegister_Success(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	mockRepo.On("GetUserByEmail", ctx, "test@example.com").Return(nil, repository.ErrUserNotFound)
	mockRepo.On("CreateUser", ctx, mock.AnythingOfType("*model.User")).Return(nil)

	req := &model.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		UserType: "driver",
	}

	response, err := svc.Register(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "test@example.com", response.User.Email)
	assert.Equal(t, "driver", string(response.User.UserType))
	assert.NotEmpty(t, response.AccessToken)
	assert.NotEmpty(t, response.RefreshToken)
	mockRepo.AssertExpectations(t)
}

func TestRegister_EmailAlreadyExists(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	existingUser := &model.User{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	mockRepo.On("GetUserByEmail", ctx, "test@example.com").Return(existingUser, nil)

	req := &model.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
		UserType: "driver",
	}

	response, err := svc.Register(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Equal(t, repository.ErrEmailAlreadyExists, err)
	mockRepo.AssertExpectations(t)
}

func TestLogin_Success(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	userID := uuid.New()
	existingUser := &model.User{
		ID:           userID,
		Email:        "test@example.com",
		PasswordHash: string(passwordHash),
		UserType:     model.UserTypeDriver,
		Status:       model.UserStatusActive,
		CreatedAt:    time.Now(),
	}

	mockRepo.On("GetUserByEmail", ctx, "test@example.com").Return(existingUser, nil)
	mockRepo.On("UpdateLastLogin", ctx, userID).Return(nil)

	req := &model.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}

	response, err := svc.Login(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, "test@example.com", response.User.Email)
	assert.NotEmpty(t, response.AccessToken)
	mockRepo.AssertExpectations(t)
}

func TestLogin_InvalidPassword(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	existingUser := &model.User{
		ID:           uuid.New(),
		Email:        "test@example.com",
		PasswordHash: string(passwordHash),
		UserType:     model.UserTypeDriver,
		Status:       model.UserStatusActive,
	}

	mockRepo.On("GetUserByEmail", ctx, "test@example.com").Return(existingUser, nil)

	req := &model.LoginRequest{
		Email:    "test@example.com",
		Password: "wrongpassword",
	}

	response, err := svc.Login(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Equal(t, service.ErrInvalidCredentials, err)
	mockRepo.AssertExpectations(t)
}

func TestLogin_UserNotFound(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	mockRepo.On("GetUserByEmail", ctx, "nonexistent@example.com").Return(nil, repository.ErrUserNotFound)

	req := &model.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "password123",
	}

	response, err := svc.Login(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Equal(t, service.ErrInvalidCredentials, err)
	mockRepo.AssertExpectations(t)
}

func TestLogin_UserNotActive(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	existingUser := &model.User{
		ID:           uuid.New(),
		Email:        "test@example.com",
		PasswordHash: string(passwordHash),
		UserType:     model.UserTypeDriver,
		Status:       model.UserStatusSuspended,
	}

	mockRepo.On("GetUserByEmail", ctx, "test@example.com").Return(existingUser, nil)

	req := &model.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}

	response, err := svc.Login(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, response)
	assert.Equal(t, service.ErrUserNotActive, err)
	mockRepo.AssertExpectations(t)
}

func TestRefreshToken_Success(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	userID := uuid.New()
	existingUser := &model.User{
		ID:       userID,
		Email:    "test@example.com",
		UserType: model.UserTypeDriver,
		Status:   model.UserStatusActive,
	}

	// Generate a valid refresh token
	jwtManager := jwt.NewJWTManager("test-secret", 15*time.Minute, 7*24*time.Hour)
	tokens, _ := jwtManager.GenerateTokenPair(userID.String(), "test@example.com", "driver")

	mockRepo.On("GetUserByID", ctx, userID).Return(existingUser, nil)

	newTokens, err := svc.RefreshToken(ctx, tokens.RefreshToken)

	assert.NoError(t, err)
	assert.NotNil(t, newTokens)
	assert.NotEmpty(t, newTokens.AccessToken)
	mockRepo.AssertExpectations(t)
}

func TestChangePassword_Success(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	userID := uuid.New()
	oldPasswordHash, _ := bcrypt.GenerateFromPassword([]byte("oldpassword"), bcrypt.DefaultCost)
	existingUser := &model.User{
		ID:           userID,
		Email:        "test@example.com",
		PasswordHash: string(oldPasswordHash),
	}

	mockRepo.On("GetUserByID", ctx, userID).Return(existingUser, nil)
	mockRepo.On("UpdatePassword", ctx, userID, mock.AnythingOfType("string")).Return(nil)

	req := &model.ChangePasswordRequest{
		OldPassword: "oldpassword",
		NewPassword: "newpassword123",
	}

	err := svc.ChangePassword(ctx, userID, req)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestChangePassword_WrongOldPassword(t *testing.T) {
	svc, mockRepo := setupTestService()
	ctx := context.Background()

	userID := uuid.New()
	oldPasswordHash, _ := bcrypt.GenerateFromPassword([]byte("oldpassword"), bcrypt.DefaultCost)
	existingUser := &model.User{
		ID:           userID,
		Email:        "test@example.com",
		PasswordHash: string(oldPasswordHash),
	}

	mockRepo.On("GetUserByID", ctx, userID).Return(existingUser, nil)

	req := &model.ChangePasswordRequest{
		OldPassword: "wrongoldpassword",
		NewPassword: "newpassword123",
	}

	err := svc.ChangePassword(ctx, userID, req)

	assert.Error(t, err)
	mockRepo.AssertExpectations(t)
}
