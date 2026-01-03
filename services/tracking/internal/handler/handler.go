package handler

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/tracking/internal/model"
	"truckify/services/tracking/internal/repository"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

// ServiceInterface defines the interface for tracking service operations
type ServiceInterface interface {
	UpdateLocation(ctx context.Context, req *model.LocationUpdateRequest) error
	GetJobTrackingHistory(ctx context.Context, jobID uuid.UUID) ([]model.TrackingEvent, error)
	GetDriverCurrentLocation(ctx context.Context, driverID uuid.UUID) (*model.CurrentLocationResponse, error)
	GetStops(ctx context.Context, jobID uuid.UUID) ([]model.Stop, error)
}

// Handler handles HTTP requests for tracking
type Handler struct {
	service   ServiceInterface
	validator *validator.Validator
	logger    *logger.Logger
}

// New creates a new handler instance
func New(service ServiceInterface, logger *logger.Logger) *Handler {
	return &Handler{
		service:   service,
		validator: validator.New(),
		logger:    logger,
	}
}

// RegisterRoutes registers all tracking routes
func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/tracking/update", h.UpdateLocation).Methods(http.MethodPost)
	router.HandleFunc("/tracking/job/{id}", h.GetJobTrackingHistory).Methods(http.MethodGet)
	router.HandleFunc("/tracking/job/{id}/stops", h.GetStops).Methods(http.MethodGet)
	router.HandleFunc("/tracking/driver/{id}/current", h.GetDriverCurrentLocation).Methods(http.MethodGet)
	router.HandleFunc("/health", h.Health).Methods(http.MethodGet)
}

// UpdateLocation handles location update requests
func (h *Handler) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.LocationUpdateRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	if err := h.service.UpdateLocation(r.Context(), &req); err != nil {
		h.logger.Error("Failed to update location", "error", err)
		response.InternalServerError(w, "Failed to update location", "", requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Location updated successfully"}, requestID)
}

// GetJobTrackingHistory handles job tracking history requests
func (h *Handler) GetJobTrackingHistory(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	vars := mux.Vars(r)
	jobID, err := uuid.Parse(vars["id"])
	if err != nil {
		response.BadRequest(w, "Invalid job ID", err.Error(), requestID)
		return
	}

	events, err := h.service.GetJobTrackingHistory(r.Context(), jobID)
	if err != nil {
		h.logger.Error("Failed to get job tracking history", "error", err)
		response.InternalServerError(w, "Failed to get tracking history", "", requestID)
		return
	}

	response.Success(w, events, requestID)
}

// GetDriverCurrentLocation handles driver current location requests
func (h *Handler) GetDriverCurrentLocation(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	vars := mux.Vars(r)
	driverID, err := uuid.Parse(vars["id"])
	if err != nil {
		response.BadRequest(w, "Invalid driver ID", err.Error(), requestID)
		return
	}

	location, err := h.service.GetDriverCurrentLocation(r.Context(), driverID)
	if err != nil {
		if err == repository.ErrTrackingEventNotFound {
			response.NotFound(w, "No location data found for driver", "", requestID)
			return
		}
		h.logger.Error("Failed to get driver current location", "error", err)
		response.InternalServerError(w, "Failed to get current location", "", requestID)
		return
	}

	response.Success(w, location, requestID)
}

// Health handles health check requests
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	response.Success(w, map[string]interface{}{
		"status":  "healthy",
		"service": "tracking-service",
	}, requestID)
}

// GetStops handles stop events requests
func (h *Handler) GetStops(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	vars := mux.Vars(r)
	jobID, err := uuid.Parse(vars["id"])
	if err != nil {
		response.BadRequest(w, "Invalid job ID", err.Error(), requestID)
		return
	}

	stops, err := h.service.GetStops(r.Context(), jobID)
	if err != nil {
		h.logger.Error("Failed to get stops", "error", err)
		response.InternalServerError(w, "Failed to get stops", "", requestID)
		return
	}

	response.Success(w, stops, requestID)
}