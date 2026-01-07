package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/shipper/internal/model"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	CreateShipper(ctx context.Context, userID uuid.UUID, req *model.CreateShipperRequest) (*model.ShipperProfile, error)
	GetShipper(ctx context.Context, userID uuid.UUID) (*model.ShipperProfile, error)
	GetShipperByID(ctx context.Context, id uuid.UUID) (*model.ShipperProfile, error)
	UpdateShipper(ctx context.Context, userID uuid.UUID, req *model.UpdateShipperRequest) (*model.ShipperProfile, error)
	UpdateStatus(ctx context.Context, userID uuid.UUID, status string) error
	DeleteShipper(ctx context.Context, userID uuid.UUID) error
	ListShippers(ctx context.Context, status string, limit, offset int) ([]model.ShipperProfile, error)
}

type Handler struct {
	service   ServiceInterface
	validator *validator.Validator
	logger    *logger.Logger
}

func New(service ServiceInterface, logger *logger.Logger) *Handler {
	return &Handler{service: service, validator: validator.New(), logger: logger}
}

func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/shippers", h.CreateShipper).Methods(http.MethodPost)
	router.HandleFunc("/shippers", h.GetShipper).Methods(http.MethodGet)
	router.HandleFunc("/shippers", h.UpdateShipper).Methods(http.MethodPut)
	router.HandleFunc("/shippers", h.DeleteShipper).Methods(http.MethodDelete)
	router.HandleFunc("/shippers/list", h.ListShippers).Methods(http.MethodGet)
	router.HandleFunc("/shippers/{id}", h.GetShipperByID).Methods(http.MethodGet)
	router.HandleFunc("/shippers/{id}/status", h.UpdateStatus).Methods(http.MethodPost)
	router.HandleFunc("/health", h.Health).Methods(http.MethodGet)
}

func (h *Handler) getUserID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.Header.Get("X-User-ID"))
}

func (h *Handler) CreateShipper(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	var req model.CreateShipperRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	shipper, err := h.service.CreateShipper(r.Context(), userID, &req)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Created(w, shipper, requestID)
}

func (h *Handler) GetShipper(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	shipper, err := h.service.GetShipper(r.Context(), userID)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, shipper, requestID)
}

func (h *Handler) GetShipperByID(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	idStr := mux.Vars(r)["id"]
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid shipper ID", err.Error(), requestID)
		return
	}

	shipper, err := h.service.GetShipperByID(r.Context(), id)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, shipper, requestID)
}

func (h *Handler) UpdateShipper(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	var req model.UpdateShipperRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	shipper, err := h.service.UpdateShipper(r.Context(), userID, &req)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, shipper, requestID)
}

func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	idStr := mux.Vars(r)["id"]
	shipperID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid shipper ID", err.Error(), requestID)
		return
	}

	var req model.UpdateStatusRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	shipper, err := h.service.GetShipperByID(r.Context(), shipperID)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	if err := h.service.UpdateStatus(r.Context(), shipper.UserID, req.Status); err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]string{"status": "updated"}, requestID)
}

func (h *Handler) DeleteShipper(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	if err := h.service.DeleteShipper(r.Context(), userID); err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Shipper deleted"}, requestID)
}

func (h *Handler) ListShippers(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	status := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 10
	offset := 0

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			offset = o
		}
	}

	shippers, err := h.service.ListShippers(r.Context(), status, limit, offset)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, shippers, requestID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	response.Success(w, map[string]string{"status": "healthy", "service": "shipper"}, requestID)
}

func (h *Handler) handleError(w http.ResponseWriter, err error, requestID string) {
	switch err.Error() {
	case "shipper not found":
		response.NotFound(w, "Shipper not found", "", requestID)
	case "shipper already exists":
		response.Conflict(w, "Shipper already exists", "", requestID)
	default:
		h.logger.Error("Handler error", "error", err)
		response.InternalServerError(w, "Internal server error", err.Error(), requestID)
	}
}
