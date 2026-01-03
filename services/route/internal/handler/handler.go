package handler

import (
	"net/http"

	"github.com/gorilla/mux"
	"truckify/services/route/internal/model"
	"truckify/services/route/internal/service"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type Handler struct {
	service   *service.Service
	validator *validator.Validator
}

func New(svc *service.Service) *Handler {
	return &Handler{service: svc, validator: validator.New()}
}

func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/route", h.CalculateRoute).Methods(http.MethodPost)
	router.HandleFunc("/route/optimize", h.OptimizeRoute).Methods(http.MethodPost)
}

func (h *Handler) CalculateRoute(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	var req model.RouteRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	result := h.service.CalculateRoute(req)
	response.Success(w, result, reqID)
}

func (h *Handler) OptimizeRoute(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	var req model.OptimizeRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	result := h.service.OptimizeRoute(req)
	response.Success(w, result, reqID)
}
