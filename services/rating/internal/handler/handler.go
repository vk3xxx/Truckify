package handler

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/rating/internal/model"
	"truckify/services/rating/internal/service"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

// ServiceInterface defines the interface for rating service operations
type ServiceInterface interface {
	CreateRating(ctx context.Context, raterID uuid.UUID, req *model.CreateRatingRequest) (*model.RatingResponse, error)
	GetRatingsByUser(ctx context.Context, userID uuid.UUID) ([]model.RatingResponse, error)
	GetRatingsByJob(ctx context.Context, jobID uuid.UUID) ([]model.RatingResponse, error)
	GetUserRatingStats(ctx context.Context, userID uuid.UUID) (*model.UserRatingStats, error)
}

// Handler handles HTTP requests for ratings
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

// RegisterRoutes registers all rating routes
func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/ratings", h.CreateRating).Methods(http.MethodPost)
	router.HandleFunc("/ratings/user/{id}", h.GetRatingsByUser).Methods(http.MethodGet)
	router.HandleFunc("/ratings/job/{id}", h.GetRatingsByJob).Methods(http.MethodGet)
	router.HandleFunc("/health", h.Health).Methods(http.MethodGet)
}

// CreateRating handles rating creation
func (h *Handler) CreateRating(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	// Get user ID from context (set by API gateway)
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid user ID", err.Error(), requestID)
		return
	}

	var req model.CreateRatingRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	result, err := h.service.CreateRating(r.Context(), userID, &req)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Created(w, result, requestID)
}

// GetRatingsByUser handles getting ratings for a user
func (h *Handler) GetRatingsByUser(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	vars := mux.Vars(r)
	userID, err := uuid.Parse(vars["id"])
	if err != nil {
		response.BadRequest(w, "Invalid user ID", err.Error(), requestID)
		return
	}

	ratings, err := h.service.GetRatingsByUser(r.Context(), userID)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]interface{}{
		"ratings": ratings,
	}, requestID)
}

// GetRatingsByJob handles getting ratings for a job
func (h *Handler) GetRatingsByJob(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	vars := mux.Vars(r)
	jobID, err := uuid.Parse(vars["id"])
	if err != nil {
		response.BadRequest(w, "Invalid job ID", err.Error(), requestID)
		return
	}

	ratings, err := h.service.GetRatingsByJob(r.Context(), jobID)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]interface{}{
		"ratings": ratings,
	}, requestID)
}

// Health handles health check requests
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	response.Success(w, map[string]interface{}{
		"status":  "healthy",
		"service": "rating-service",
	}, requestID)
}

// handleError handles service errors and returns appropriate HTTP responses
func (h *Handler) handleError(w http.ResponseWriter, err error, requestID string) {
	switch err {
	case service.ErrRatingAlreadyExists:
		response.Conflict(w, "Rating already exists for this job", "", requestID)
	case service.ErrInvalidRating:
		response.BadRequest(w, "Rating must be between 1 and 5", "", requestID)
	case service.ErrCannotRateSelf:
		response.BadRequest(w, "Cannot rate yourself", "", requestID)
	case service.ErrRatingNotFound:
		response.NotFound(w, "Rating not found", "", requestID)
	default:
		h.logger.Error("Internal error", "error", err)
		response.InternalServerError(w, "Internal server error", "", requestID)
	}
}