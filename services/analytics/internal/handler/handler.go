package handler

import (
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"truckify/services/analytics/internal/service"
	"truckify/shared/pkg/response"
)

type Handler struct {
	svc *service.Service
}

func New(svc *service.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/analytics/dashboard", h.GetDashboardStats).Methods("GET")
	r.HandleFunc("/analytics/jobs/status", h.GetJobsByStatus).Methods("GET")
	r.HandleFunc("/analytics/jobs/daily", h.GetJobsByDay).Methods("GET")
	r.HandleFunc("/analytics/revenue/daily", h.GetRevenueByDay).Methods("GET")
	r.HandleFunc("/analytics/routes/top", h.GetTopRoutes).Methods("GET")
	r.HandleFunc("/health", h.Health).Methods("GET")
}

func (h *Handler) getRequestID(r *http.Request) string {
	if id, ok := r.Context().Value("request_id").(string); ok {
		return id
	}
	return ""
}

func (h *Handler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	stats, err := h.svc.GetDashboardStats()
	if err != nil {
		response.InternalServerError(w, "failed to get stats", err.Error(), reqID)
		return
	}
	response.Success(w, stats, reqID)
}

func (h *Handler) GetJobsByStatus(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	data, err := h.svc.GetJobsByStatus()
	if err != nil {
		response.InternalServerError(w, "failed to get data", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}

func (h *Handler) GetJobsByDay(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days <= 0 {
		days = 7
	}
	data, err := h.svc.GetJobsByDay(days)
	if err != nil {
		response.InternalServerError(w, "failed to get data", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}

func (h *Handler) GetRevenueByDay(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days <= 0 {
		days = 7
	}
	data, err := h.svc.GetRevenueByDay(days)
	if err != nil {
		response.InternalServerError(w, "failed to get data", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}

func (h *Handler) GetTopRoutes(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 5
	}
	data, err := h.svc.GetTopRoutes(limit)
	if err != nil {
		response.InternalServerError(w, "failed to get data", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	response.Success(w, map[string]string{"status": "healthy", "service": "analytics-service"}, reqID)
}
