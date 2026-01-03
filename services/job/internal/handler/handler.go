package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/job/internal/model"
	"truckify/services/job/internal/repository"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	CreateJob(shipperID uuid.UUID, req *model.CreateJobRequest) (*model.Job, error)
	GetJob(id uuid.UUID) (*model.Job, error)
	ListJobs(filter model.JobFilter) ([]*model.Job, error)
	UpdateJob(id uuid.UUID, req *model.UpdateJobRequest) (*model.Job, error)
	AssignDriver(jobID, driverID uuid.UUID) error
	UpdateStatus(id uuid.UUID, status string) (*model.Job, error)
	DeleteJob(id uuid.UUID) error
}

type Handler struct {
	svc ServiceInterface
	val *validator.Validator
}

func New(svc ServiceInterface) *Handler {
	return &Handler{svc: svc, val: validator.New()}
}

func (h *Handler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/jobs/all", h.ListAllJobs).Methods("GET")
	r.HandleFunc("/jobs", h.CreateJob).Methods("POST")
	r.HandleFunc("/jobs", h.ListJobs).Methods("GET")
	r.HandleFunc("/jobs/{id}", h.GetJob).Methods("GET")
	r.HandleFunc("/jobs/{id}", h.UpdateJob).Methods("PUT")
	r.HandleFunc("/jobs/{id}", h.DeleteJob).Methods("DELETE")
	r.HandleFunc("/jobs/{id}/assign", h.AssignDriver).Methods("POST")
	r.HandleFunc("/jobs/{id}/pickup", h.MarkPickedUp).Methods("POST")
	r.HandleFunc("/jobs/{id}/deliver", h.MarkDelivered).Methods("POST")
	r.HandleFunc("/jobs/{id}/cancel", h.CancelJob).Methods("POST")
	r.HandleFunc("/health", h.Health).Methods("GET")
}

func (h *Handler) getUserID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.Header.Get("X-User-ID"))
}

func (h *Handler) reqID(r *http.Request) string {
	if id, ok := r.Context().Value("request_id").(string); ok {
		return id
	}
	return ""
}

func (h *Handler) CreateJob(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.CreateJobRequest
	if h.val != nil {
		if err := h.val.DecodeAndValidate(r, &req); err != nil {
			response.BadRequest(w, "validation error", err.Error(), reqID)
			return
		}
	} else {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "validation error", err.Error(), reqID)
			return
		}
	}

	job, err := h.svc.CreateJob(userID, &req)
	if err != nil {
		response.InternalServerError(w, "create failed", err.Error(), reqID)
		return
	}
	response.Created(w, job, reqID)
}

func (h *Handler) GetJob(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	job, err := h.svc.GetJob(id)
	if err == repository.ErrNotFound {
		response.NotFound(w, "job not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}
	response.Success(w, job, reqID)
}

func (h *Handler) ListJobs(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	filter := model.JobFilter{
		Status:      r.URL.Query().Get("status"),
		VehicleType: r.URL.Query().Get("vehicle_type"),
		Limit:       limit,
	}

	jobs, err := h.svc.ListJobs(filter)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}
	response.Success(w, jobs, reqID)
}

func (h *Handler) ListAllJobs(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	jobs, err := h.svc.ListJobs(model.JobFilter{Limit: 1000})
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}
	response.Success(w, jobs, reqID)
}

func (h *Handler) UpdateJob(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	var req model.UpdateJobRequest
	if h.val != nil {
		if err := h.val.DecodeAndValidate(r, &req); err != nil {
			response.BadRequest(w, "validation error", err.Error(), reqID)
			return
		}
	} else {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "validation error", err.Error(), reqID)
			return
		}
	}

	job, err := h.svc.UpdateJob(id, &req)
	if err == repository.ErrNotFound {
		response.NotFound(w, "job not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}
	response.Success(w, job, reqID)
}

func (h *Handler) AssignDriver(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	jobID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid job id", "", reqID)
		return
	}

	var req model.AssignDriverRequest
	if h.val != nil {
		if err := h.val.DecodeAndValidate(r, &req); err != nil {
			response.BadRequest(w, "validation error", err.Error(), reqID)
			return
		}
	} else {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "validation error", err.Error(), reqID)
			return
		}
	}

	driverID, _ := uuid.Parse(req.DriverID)
	if err := h.svc.AssignDriver(jobID, driverID); err != nil {
		response.InternalServerError(w, "assign failed", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "driver assigned"}, reqID)
}

func (h *Handler) DeleteJob(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	if err := h.svc.DeleteJob(id); err == repository.ErrNotFound {
		response.NotFound(w, "job not found", "", reqID)
		return
	} else if err != nil {
		response.InternalServerError(w, "delete failed", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "job deleted"}, reqID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	response.Success(w, map[string]string{"status": "healthy", "service": "job-service"}, h.reqID(r))
}

func (h *Handler) MarkPickedUp(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}
	job, err := h.svc.UpdateStatus(id, "in_transit")
	if err == repository.ErrNotFound {
		response.NotFound(w, "job not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}
	response.Success(w, job, reqID)
}

func (h *Handler) MarkDelivered(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}
	job, err := h.svc.UpdateStatus(id, "delivered")
	if err == repository.ErrNotFound {
		response.NotFound(w, "job not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}
	response.Success(w, job, reqID)
}

func (h *Handler) CancelJob(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}
	job, err := h.svc.UpdateStatus(id, "cancelled")
	if err == repository.ErrNotFound {
		response.NotFound(w, "job not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}
	response.Success(w, job, reqID)
}
