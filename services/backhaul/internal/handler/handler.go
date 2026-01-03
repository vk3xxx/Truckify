package handler

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/backhaul/internal/model"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	FindBackhauls(ctx context.Context, req model.FindBackhaulRequest) ([]model.BackhaulMatch, error)
	CreateOpportunity(ctx context.Context, opp *model.BackhaulOpportunity) error
	ClaimOpportunity(ctx context.Context, id uuid.UUID) error
}

type Handler struct {
	service   ServiceInterface
	validator *validator.Validator
}

func New(svc ServiceInterface) *Handler {
	return &Handler{service: svc, validator: validator.New()}
}

func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/backhaul/find", h.FindBackhauls).Methods(http.MethodPost)
	router.HandleFunc("/backhaul", h.CreateOpportunity).Methods(http.MethodPost)
	router.HandleFunc("/backhaul/{id}/claim", h.ClaimOpportunity).Methods(http.MethodPost)
}

func (h *Handler) FindBackhauls(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	var req model.FindBackhaulRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	matches, err := h.service.FindBackhauls(r.Context(), req)
	if err != nil {
		response.InternalServerError(w, "Failed to find backhauls", "", reqID)
		return
	}
	response.Success(w, matches, reqID)
}

func (h *Handler) CreateOpportunity(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	var opp model.BackhaulOpportunity
	if err := h.validator.DecodeAndValidate(r, &opp); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	if err := h.service.CreateOpportunity(r.Context(), &opp); err != nil {
		response.InternalServerError(w, "Failed to create opportunity", "", reqID)
		return
	}
	response.Created(w, opp, reqID)
}

func (h *Handler) ClaimOpportunity(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid ID", "", reqID)
		return
	}
	if err := h.service.ClaimOpportunity(r.Context(), id); err != nil {
		response.InternalServerError(w, "Failed to claim", "", reqID)
		return
	}
	response.Success(w, map[string]string{"message": "Opportunity claimed"}, reqID)
}
