package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"truckify/services/user/internal/handler"
	"truckify/services/user/internal/model"
	"truckify/shared/pkg/logger"
)

type MockService struct {
	mock.Mock
}

func (m *MockService) CreateProfile(ctx context.Context, userID uuid.UUID, req *model.CreateProfileRequest) (*model.UserProfile, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.UserProfile), args.Error(1)
}

func (m *MockService) GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.UserProfile), args.Error(1)
}

func (m *MockService) UpdateProfile(ctx context.Context, userID uuid.UUID, req *model.UpdateProfileRequest) (*model.UserProfile, error) {
	args := m.Called(ctx, userID, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.UserProfile), args.Error(1)
}

func (m *MockService) DeleteProfile(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func setupTestHandler() (*handler.Handler, *MockService) {
	mockService := new(MockService)
	log := logger.New("test", "debug")
	h := handler.New(mockService, log)
	return h, mockService
}

func TestCreateProfile_Success(t *testing.T) {
	h, mockService := setupTestHandler()

	userID := uuid.New()
	profileID := uuid.New()
	expectedProfile := &model.UserProfile{
		ID:        profileID,
		UserID:    userID,
		FirstName: "John",
		LastName:  "Doe",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	mockService.On("CreateProfile", mock.Anything, userID, mock.MatchedBy(func(req *model.CreateProfileRequest) bool {
		return req.FirstName == "John" && req.LastName == "Doe"
	})).Return(expectedProfile, nil)

	body := `{"first_name":"John","last_name":"Doe"}`
	req := httptest.NewRequest(http.MethodPost, "/profile", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())
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

func TestCreateProfile_Unauthorized(t *testing.T) {
	h, _ := setupTestHandler()

	body := `{"first_name":"John","last_name":"Doe"}`
	req := httptest.NewRequest(http.MethodPost, "/profile", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	// No X-User-ID header
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestCreateProfile_InvalidRequest(t *testing.T) {
	h, _ := setupTestHandler()

	userID := uuid.New()
	body := `{"first_name":""}` // Missing last_name
	req := httptest.NewRequest(http.MethodPost, "/profile", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetProfile_Success(t *testing.T) {
	h, mockService := setupTestHandler()

	userID := uuid.New()
	profileID := uuid.New()
	expectedProfile := &model.UserProfile{
		ID:        profileID,
		UserID:    userID,
		FirstName: "John",
		LastName:  "Doe",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	mockService.On("GetProfile", mock.Anything, userID).Return(expectedProfile, nil)

	req := httptest.NewRequest(http.MethodGet, "/profile", nil)
	req.Header.Set("X-User-ID", userID.String())
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

func TestGetProfile_NotFound(t *testing.T) {
	h, mockService := setupTestHandler()

	userID := uuid.New()
	mockService.On("GetProfile", mock.Anything, userID).Return(nil, handler.ErrProfileNotFound)

	req := httptest.NewRequest(http.MethodGet, "/profile", nil)
	req.Header.Set("X-User-ID", userID.String())
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	mockService.AssertExpectations(t)
}

func TestUpdateProfile_Success(t *testing.T) {
	h, mockService := setupTestHandler()

	userID := uuid.New()
	profileID := uuid.New()
	firstName := "Jane"
	expectedProfile := &model.UserProfile{
		ID:        profileID,
		UserID:    userID,
		FirstName: "Jane",
		LastName:  "Doe",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	mockService.On("UpdateProfile", mock.Anything, userID, mock.MatchedBy(func(req *model.UpdateProfileRequest) bool {
		return req.FirstName != nil && *req.FirstName == firstName
	})).Return(expectedProfile, nil)

	body := `{"first_name":"Jane"}`
	req := httptest.NewRequest(http.MethodPut, "/profile", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", userID.String())
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	h.RegisterRoutes(router)
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockService.AssertExpectations(t)
}

func TestDeleteProfile_Success(t *testing.T) {
	h, mockService := setupTestHandler()

	userID := uuid.New()
	mockService.On("DeleteProfile", mock.Anything, userID).Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/profile", nil)
	req.Header.Set("X-User-ID", userID.String())
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
