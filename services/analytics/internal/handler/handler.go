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
	// Demand forecasting & dynamic pricing
	r.HandleFunc("/analytics/forecast/demand", h.ForecastDemand).Methods("GET")
	r.HandleFunc("/analytics/forecast/heatmap", h.GetDemandHeatmap).Methods("GET")
	r.HandleFunc("/analytics/pricing/recommend", h.GetPricingRecommendation).Methods("GET")
	r.HandleFunc("/analytics/market/conditions", h.GetMarketConditions).Methods("GET")
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


// ForecastDemand returns demand predictions for routes
func (h *Handler) ForecastDemand(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days <= 0 || days > 14 {
		days = 7
	}
	data, err := h.svc.ForecastDemand(days)
	if err != nil {
		response.InternalServerError(w, "failed to forecast demand", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}

// GetDemandHeatmap returns demand intensity by region
func (h *Handler) GetDemandHeatmap(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	data, err := h.svc.GetDemandHeatmap()
	if err != nil {
		response.InternalServerError(w, "failed to get heatmap", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}

// GetPricingRecommendation returns dynamic pricing for a route
func (h *Handler) GetPricingRecommendation(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	origin := r.URL.Query().Get("origin")
	destination := r.URL.Query().Get("destination")
	basePrice, _ := strconv.ParseFloat(r.URL.Query().Get("base_price"), 64)

	if origin == "" || destination == "" {
		response.BadRequest(w, "origin and destination required", "", reqID)
		return
	}
	if basePrice <= 0 {
		basePrice = 1000 // Default base price
	}

	data, err := h.svc.GetPricingRecommendation(origin, destination, basePrice)
	if err != nil {
		response.InternalServerError(w, "failed to get pricing", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}

// GetMarketConditions returns current market state
func (h *Handler) GetMarketConditions(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	region := r.URL.Query().Get("region")

	data, err := h.svc.GetMarketConditions(region)
	if err != nil {
		response.InternalServerError(w, "failed to get conditions", err.Error(), reqID)
		return
	}
	response.Success(w, data, reqID)
}
