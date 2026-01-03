package handler

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/matching/internal/model"
	"truckify/services/matching/internal/repository"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	FindMatches(req *model.MatchRequest) (*model.MatchResponse, error)
	GetMatchesForJob(jobID uuid.UUID) ([]*model.Match, error)
	GetPendingMatches(driverID uuid.UUID) ([]*model.Match, error)
	AcceptMatch(matchID uuid.UUID) error
	RejectMatch(matchID uuid.UUID) error
}

type Handler struct {
	svc ServiceInterface
	val *validator.Validator
}

func New(svc ServiceInterface) *Handler {
	return &Handler{svc: svc, val: validator.New()}
}

func (h *Handler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/match", h.FindMatches).Methods("POST")
	r.HandleFunc("/matches/job/{jobId}", h.GetMatchesForJob).Methods("GET")
	r.HandleFunc("/matches/pending", h.GetPendingMatches).Methods("GET")
	r.HandleFunc("/matches/{id}/accept", h.AcceptMatch).Methods("POST")
	r.HandleFunc("/matches/{id}/reject", h.RejectMatch).Methods("POST")
	r.HandleFunc("/health", h.Health).Methods("GET")
}

func (h *Handler) reqID(r *http.Request) string {
	if id, ok := r.Context().Value("request_id").(string); ok {
		return id
	}
	return ""
}

func (h *Handler) FindMatches(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)

	var req model.MatchRequest
	if h.val != nil {
		if err := h.val.DecodeAndValidate(r, &req); err != nil {
			response.BadRequest(w, "validation error", err.Error(), reqID)
			return
		}
	} else {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "invalid json", err.Error(), reqID)
			return
		}
	}

	result, err := h.svc.FindMatches(&req)
	if err != nil {
		response.InternalServerError(w, "matching failed", err.Error(), reqID)
		return
	}

	response.Success(w, result, reqID)
}

func (h *Handler) GetMatchesForJob(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	jobID, err := uuid.Parse(mux.Vars(r)["jobId"])
	if err != nil {
		response.BadRequest(w, "invalid job id", "", reqID)
		return
	}

	matches, err := h.svc.GetMatchesForJob(jobID)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}

	response.Success(w, matches, reqID)
}

func (h *Handler) GetPendingMatches(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	driverIDStr := r.Header.Get("X-User-ID")
	driverID, err := uuid.Parse(driverIDStr)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	matches, err := h.svc.GetPendingMatches(driverID)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}

	response.Success(w, matches, reqID)
}

func (h *Handler) AcceptMatch(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	matchID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid match id", "", reqID)
		return
	}

	if err := h.svc.AcceptMatch(matchID); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(w, "match not found", "", reqID)
			return
		}
		response.InternalServerError(w, "accept failed", err.Error(), reqID)
		return
	}

	response.Success(w, map[string]string{"message": "match accepted"}, reqID)
}

func (h *Handler) RejectMatch(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	matchID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid match id", "", reqID)
		return
	}

	if err := h.svc.RejectMatch(matchID); err != nil {
		if err == repository.ErrNotFound {
			response.NotFound(w, "match not found", "", reqID)
			return
		}
		response.InternalServerError(w, "reject failed", err.Error(), reqID)
		return
	}

	response.Success(w, map[string]string{"message": "match rejected"}, reqID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	response.Success(w, map[string]string{"status": "healthy", "service": "matching-service"}, h.reqID(r))
}
