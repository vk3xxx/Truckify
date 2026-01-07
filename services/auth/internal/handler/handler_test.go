package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"truckify/services/auth/internal/handler"
	"truckify/services/auth/internal/model"
	"truckify/shared/pkg/jwt"
	"truckify/shared/pkg/logger"
)

type MockService struct {
	mock.Mock
}

func (m *MockService) Register(ctx context.Context, req *model.RegisterRequest) (*model.LoginResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.LoginResponse), args.Error(1)
}

func (m *MockService) Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.LoginResponse), args.Error(1)
}

func (m *MockService) RefreshToken(ctx context.Context, refreshToken string) (*jwt.TokenPair, error) {
	args := m.Called(ctx, refreshToken)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*jwt.TokenPair), args.Error(1)
}

func (m *MockService) ChangePassword(ctx context.Context, userID uuid.UUID, req *model.ChangePasswordRequest) error {
	args := m.Called(ctx, userID, req)
	return args.Error(0)
}

func (m *MockService) ForgotPassword(ctx context.Context, req *model.ForgotPasswordRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockService) ResetPassword(ctx context.Context, req *model.ResetPasswordRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockService) VerifyEmail(ctx context.Context, req *model.VerifyEmailRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockService) BeginPasskeyRegistration(ctx context.Context, userID uuid.UUID) (*protocol.CredentialCreation, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*protocol.CredentialCreation), args.Error(1)
}

func (m *MockService) FinishPasskeyRegistration(ctx context.Context, userID uuid.UUID, name, response string) (*model.PasskeyCredential, error) {
	args := m.Called(ctx, userID, name, response)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.PasskeyCredential), args.Error(1)
}

func (m *MockService) BeginPasskeyLogin(ctx context.Context, email string) (*protocol.CredentialAssertion, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*protocol.CredentialAssertion), args.Error(1)
}

func (m *MockService) FinishPasskeyLogin(ctx context.Context, email, response string) (*model.LoginResponse, error) {
	args := m.Called(ctx, email, response)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.LoginResponse), args.Error(1)
}

func (m *MockService) GetUserPasskeys(ctx context.Context, userID uuid.UUID) ([]model.PasskeyCredential, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.PasskeyCredential), args.Error(1)
}

func (m *MockService) DeletePasskey(ctx context.Context, userID, passkeyID uuid.UUID) error {
	args := m.Called(ctx, userID, passkeyID)
	return args.Error(0)
}

func (m *MockService) ListUsers(ctx context.Context) ([]model.User, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.User), args.Error(1)
}

func (m *MockService) UpdateUserStatus(ctx context.Context, userID uuid.UUID, status string) error {
	args := m.Called(ctx, userID, status)
	return args.Error(0)
}

func setupTestHandler() (*handler.Handler, *MockService) {
	mockService := new(MockService)
	log := logger.New("test", "debug")
	h := handler.New(mockService, log)
	return h, mockService
}

func TestRegister_Success(t *testing.T) {
	h, mockService := setupTestHandler()

	userID := uuid.New()
	expectedResponse := &model.LoginResponse{
		User: &model.UserResponse{
			ID:        userID,
			Email:     "test@example.com",
			UserType:  "driver",
			Status:    "active",
			CreatedAt: time.Now(),
		},
		AccessToken:  "access_token",
		RefreshToken: "refresh_token",
		ExpiresIn:    900,
	}

	mockService.On("Register", mock.Anything, mock.MatchedBy(func(req *model.RegisterRequest) bool {
		return req.Email == "test@example.com" && req.Password == "password123" && req.UserType == "driver"
	})).Return(expectedResponse, nil)

	body := `{"email":"test@example.com","password":"password123","user_type":"driver"}`
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var response map[string]interface{}
	json.Unmarshal(rr.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))
	mockService.AssertExpectations(t)
}

func TestRegister_InvalidEmail(t *testing.T) {
	h, _ := setupTestHandler()

	body := `{"email":"invalid-email","password":"password123","user_type":"driver"}`
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegister_MissingPassword(t *testing.T) {
	h, _ := setupTestHandler()

	body := `{"email":"test@example.com","user_type":"driver"}`
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRegister_InvalidUserType(t *testing.T) {
	h, _ := setupTestHandler()

	body := `{"email":"test@example.com","password":"password123","user_type":"invalid"}`
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestLogin_Success(t *testing.T) {
	h, mockService := setupTestHandler()

	userID := uuid.New()
	expectedResponse := &model.LoginResponse{
		User: &model.UserResponse{
			ID:        userID,
			Email:     "test@example.com",
			UserType:  "driver",
			Status:    "active",
			CreatedAt: time.Now(),
		},
		AccessToken:  "access_token",
		RefreshToken: "refresh_token",
		ExpiresIn:    900,
	}

	mockService.On("Login", mock.Anything, mock.MatchedBy(func(req *model.LoginRequest) bool {
		return req.Email == "test@example.com" && req.Password == "password123"
	})).Return(expectedResponse, nil)

	body := `{"email":"test@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	json.Unmarshal(rr.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))
	mockService.AssertExpectations(t)
}

func TestLogin_InvalidCredentials(t *testing.T) {
	h, mockService := setupTestHandler()

	mockService.On("Login", mock.Anything, mock.Anything).Return(nil, handler.ErrInvalidCredentials)

	body := `{"email":"test@example.com","password":"wrongpassword"}`
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	mockService.AssertExpectations(t)
}

func TestRefreshToken_Success(t *testing.T) {
	h, mockService := setupTestHandler()

	expectedTokens := &jwt.TokenPair{
		AccessToken:  "new_access_token",
		RefreshToken: "new_refresh_token",
		ExpiresIn:    900,
	}

	mockService.On("RefreshToken", mock.Anything, "valid_refresh_token").Return(expectedTokens, nil)

	body := `{"refresh_token":"valid_refresh_token"}`
	req := httptest.NewRequest(http.MethodPost, "/refresh", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockService.AssertExpectations(t)
}

func TestHealth_Success(t *testing.T) {
	h, _ := setupTestHandler()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	json.Unmarshal(rr.Body.Bytes(), &response)
	assert.True(t, response["success"].(bool))
	data := response["data"].(map[string]interface{})
	assert.Equal(t, "healthy", data["status"])
}
