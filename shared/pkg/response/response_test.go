package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSuccess(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"message": "success"}
	requestID := "test-request-id"

	Success(w, data, requestID)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.True(t, resp.Success)
	assert.NotNil(t, resp.Data)
	assert.Nil(t, resp.Error)
	assert.Equal(t, requestID, resp.Metadata.RequestID)
	assert.NotEmpty(t, resp.Metadata.Timestamp)
}

func TestCreated(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"id": "123"}
	requestID := "test-request-id"

	Created(w, data, requestID)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.True(t, resp.Success)
	assert.Equal(t, requestID, resp.Metadata.RequestID)
}

func TestNoContent(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	NoContent(w, requestID)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, requestID, w.Header().Get("X-Request-ID"))
	assert.Empty(t, w.Body.String())
}

func TestError(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	Error(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid input", "Missing required field", requestID)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Nil(t, resp.Data)
	assert.NotNil(t, resp.Error)
	assert.Equal(t, "BAD_REQUEST", resp.Error.Code)
	assert.Equal(t, "Invalid input", resp.Error.Message)
	assert.Equal(t, "Missing required field", resp.Error.Details)
	assert.Equal(t, requestID, resp.Metadata.RequestID)
}

func TestBadRequest(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	BadRequest(w, "Invalid request", "Email is required", requestID)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Equal(t, "BAD_REQUEST", resp.Error.Code)
	assert.Equal(t, "Invalid request", resp.Error.Message)
	assert.Equal(t, "Email is required", resp.Error.Details)
}

func TestUnauthorized(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	Unauthorized(w, "Unauthorized", "Invalid token", requestID)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Equal(t, "UNAUTHORIZED", resp.Error.Code)
}

func TestForbidden(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	Forbidden(w, "Forbidden", "Insufficient permissions", requestID)

	assert.Equal(t, http.StatusForbidden, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Equal(t, "FORBIDDEN", resp.Error.Code)
}

func TestNotFound(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	NotFound(w, "Not found", "Resource not found", requestID)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Equal(t, "NOT_FOUND", resp.Error.Code)
}

func TestConflict(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	Conflict(w, "Conflict", "Email already exists", requestID)

	assert.Equal(t, http.StatusConflict, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Equal(t, "CONFLICT", resp.Error.Code)
}

func TestInternalServerError(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	InternalServerError(w, "Internal error", "Database connection failed", requestID)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Equal(t, "INTERNAL_SERVER_ERROR", resp.Error.Code)
}

func TestServiceUnavailable(t *testing.T) {
	w := httptest.NewRecorder()
	requestID := "test-request-id"

	ServiceUnavailable(w, "Service unavailable", "Database is down", requestID)

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.False(t, resp.Success)
	assert.Equal(t, "SERVICE_UNAVAILABLE", resp.Error.Code)
}

func TestGetRequestIDGeneration(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"message": "test"}

	// Call with empty request ID - should generate one
	Success(w, data, "")

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	assert.NotEmpty(t, resp.Metadata.RequestID)
	// UUID should have at least 32 characters (without dashes)
	assert.GreaterOrEqual(t, len(resp.Metadata.RequestID), 32)
}

func TestTimestampFormat(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"message": "test"}
	requestID := "test-request-id"

	Success(w, data, requestID)

	var resp Response
	err := json.NewDecoder(w.Body).Decode(&resp)
	require.NoError(t, err)

	// Timestamp should be in RFC3339 format
	assert.NotEmpty(t, resp.Metadata.Timestamp)
	assert.Contains(t, resp.Metadata.Timestamp, "T")
	assert.Contains(t, resp.Metadata.Timestamp, "Z")
}

func TestResponseStructure(t *testing.T) {
	tests := []struct {
		name           string
		fn             func(w http.ResponseWriter, requestID string)
		expectedStatus int
		expectedCode   string
	}{
		{
			name:           "bad request",
			fn:             func(w http.ResponseWriter, rid string) { BadRequest(w, "test", "", rid) },
			expectedStatus: http.StatusBadRequest,
			expectedCode:   "BAD_REQUEST",
		},
		{
			name:           "unauthorized",
			fn:             func(w http.ResponseWriter, rid string) { Unauthorized(w, "test", "", rid) },
			expectedStatus: http.StatusUnauthorized,
			expectedCode:   "UNAUTHORIZED",
		},
		{
			name:           "forbidden",
			fn:             func(w http.ResponseWriter, rid string) { Forbidden(w, "test", "", rid) },
			expectedStatus: http.StatusForbidden,
			expectedCode:   "FORBIDDEN",
		},
		{
			name:           "not found",
			fn:             func(w http.ResponseWriter, rid string) { NotFound(w, "test", "", rid) },
			expectedStatus: http.StatusNotFound,
			expectedCode:   "NOT_FOUND",
		},
		{
			name:           "conflict",
			fn:             func(w http.ResponseWriter, rid string) { Conflict(w, "test", "", rid) },
			expectedStatus: http.StatusConflict,
			expectedCode:   "CONFLICT",
		},
		{
			name:           "internal server error",
			fn:             func(w http.ResponseWriter, rid string) { InternalServerError(w, "test", "", rid) },
			expectedStatus: http.StatusInternalServerError,
			expectedCode:   "INTERNAL_SERVER_ERROR",
		},
		{
			name:           "service unavailable",
			fn:             func(w http.ResponseWriter, rid string) { ServiceUnavailable(w, "test", "", rid) },
			expectedStatus: http.StatusServiceUnavailable,
			expectedCode:   "SERVICE_UNAVAILABLE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			requestID := "test-request-id"

			tt.fn(w, requestID)

			assert.Equal(t, tt.expectedStatus, w.Code)

			var resp Response
			err := json.NewDecoder(w.Body).Decode(&resp)
			require.NoError(t, err)

			assert.False(t, resp.Success)
			assert.NotNil(t, resp.Error)
			assert.Equal(t, tt.expectedCode, resp.Error.Code)
			assert.Equal(t, requestID, resp.Metadata.RequestID)
		})
	}
}
