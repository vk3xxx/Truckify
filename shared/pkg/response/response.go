package response

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// Response represents a standardized API response
type Response struct {
	Success  bool        `json:"success"`
	Data     interface{} `json:"data,omitempty"`
	Error    *ErrorInfo  `json:"error,omitempty"`
	Metadata Metadata    `json:"metadata"`
}

// ErrorInfo contains error details
type ErrorInfo struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// Metadata contains response metadata
type Metadata struct {
	Timestamp string `json:"timestamp"`
	RequestID string `json:"request_id"`
}

// Success sends a successful response
func Success(w http.ResponseWriter, data interface{}, requestID string) {
	Send(w, http.StatusOK, Response{
		Success: true,
		Data:    data,
		Metadata: Metadata{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			RequestID: getRequestID(requestID),
		},
	})
}

// Created sends a 201 Created response
func Created(w http.ResponseWriter, data interface{}, requestID string) {
	Send(w, http.StatusCreated, Response{
		Success: true,
		Data:    data,
		Metadata: Metadata{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			RequestID: getRequestID(requestID),
		},
	})
}

// NoContent sends a 204 No Content response
func NoContent(w http.ResponseWriter, requestID string) {
	w.Header().Set("X-Request-ID", getRequestID(requestID))
	w.WriteHeader(http.StatusNoContent)
}

// Error sends an error response
func Error(w http.ResponseWriter, statusCode int, code, message, details, requestID string) {
	Send(w, statusCode, Response{
		Success: false,
		Error: &ErrorInfo{
			Code:    code,
			Message: message,
			Details: details,
		},
		Metadata: Metadata{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			RequestID: getRequestID(requestID),
		},
	})
}

// BadRequest sends a 400 Bad Request response
func BadRequest(w http.ResponseWriter, message, details, requestID string) {
	Error(w, http.StatusBadRequest, "BAD_REQUEST", message, details, requestID)
}

// Unauthorized sends a 401 Unauthorized response
func Unauthorized(w http.ResponseWriter, message, details, requestID string) {
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", message, details, requestID)
}

// Forbidden sends a 403 Forbidden response
func Forbidden(w http.ResponseWriter, message, details, requestID string) {
	Error(w, http.StatusForbidden, "FORBIDDEN", message, details, requestID)
}

// NotFound sends a 404 Not Found response
func NotFound(w http.ResponseWriter, message, details, requestID string) {
	Error(w, http.StatusNotFound, "NOT_FOUND", message, details, requestID)
}

// Conflict sends a 409 Conflict response
func Conflict(w http.ResponseWriter, message, details, requestID string) {
	Error(w, http.StatusConflict, "CONFLICT", message, details, requestID)
}

// InternalServerError sends a 500 Internal Server Error response
func InternalServerError(w http.ResponseWriter, message, details, requestID string) {
	Error(w, http.StatusInternalServerError, "INTERNAL_SERVER_ERROR", message, details, requestID)
}

// ServiceUnavailable sends a 503 Service Unavailable response
func ServiceUnavailable(w http.ResponseWriter, message, details, requestID string) {
	Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", message, details, requestID)
}

// Send sends a JSON response
func Send(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// getRequestID returns the request ID or generates a new one
func getRequestID(requestID string) string {
	if requestID == "" {
		return uuid.New().String()
	}
	return requestID
}
