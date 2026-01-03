package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"truckify/services/tracking/internal/model"
	"truckify/shared/pkg/logger"
)

// MockService is a mock implementation of ServiceInterface
type MockService struct {
	mock.Mock
}

func (m *MockService) UpdateLocation(ctx context.Context, req *model.LocationUpdateRequest) error {
	args := m.Called(ctx, req)
	return args.Error(0)
}

func (m *MockService) GetJobTrackingHistory(ctx context.Context, jobID uuid.UUID) ([]model.TrackingEvent, error) {
	args := m.Called(ctx, jobID)
	return args.Get(0).([]model.TrackingEvent), args.Error(1)
}

func (m *MockService) GetDriverCurrentLocation(ctx context.Context, driverID uuid.UUID) (*model.CurrentLocationResponse, error) {
	args := m.Called(ctx, driverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.CurrentLocationResponse), args.Error(1)
}

func TestHandler_UpdateLocation(t *testing.T) {
	mockService := new(MockService)
	log := logger.New("test", "info")
	handler := New(mockService, log)

	// Test data
	req := model.LocationUpdateRequest{
		JobID:     uuid.New(),
		DriverID:  uuid.New(),
		Latitude:  -33.8688,
		Longitude: 151.2093,
		Speed:     60.5,
		Heading:   90.0,
		EventType: model.EventTypeLocation,
	}

	mockService.On("UpdateLocation", mock.Anything, &req).Return(nil)

	// Create request
	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/tracking/update", bytes.NewBuffer(body))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), "request_id", "test-123"))

	// Create response recorder
	w := httptest.NewRecorder()

	// Call handler
	handler.UpdateLocation(w, httpReq)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestHandler_Health(t *testing.T) {
	mockService := new(MockService)
	log := logger.New("test", "info")
	handler := New(mockService, log)

	// Create request
	httpReq := httptest.NewRequest(http.MethodGet, "/health", nil)
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), "request_id", "test-123"))

	// Create response recorder
	w := httptest.NewRecorder()

	// Call handler
	handler.Health(w, httpReq)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "healthy", response["data"].(map[string]interface{})["status"])
	assert.Equal(t, "tracking-service", response["data"].(map[string]interface{})["service"])
}