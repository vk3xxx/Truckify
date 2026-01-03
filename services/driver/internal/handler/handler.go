package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/driver/internal/model"
	"truckify/services/driver/internal/repository"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	CreateDriver(userID uuid.UUID, req *model.CreateDriverRequest) (*model.DriverProfile, error)
	GetDriver(userID uuid.UUID) (*model.DriverProfile, error)
	GetDriverByID(id uuid.UUID) (*model.DriverProfile, error)
	UpdateDriver(userID uuid.UUID, req *model.UpdateDriverRequest) (*model.DriverProfile, error)
	UpdateLocation(userID uuid.UUID, req *model.UpdateLocationRequest) error
	AddVehicle(userID uuid.UUID, req *model.AddVehicleRequest) (*model.Vehicle, error)
	GetAvailableDrivers(vehicleType string, limit int) ([]*model.DriverProfile, error)
}

type Handler struct {
	svc ServiceInterface
	val *validator.Validator
}

func New(svc ServiceInterface) *Handler {
	return &Handler{svc: svc, val: validator.New()}
}

func (h *Handler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/driver", h.CreateDriver).Methods("POST")
	r.HandleFunc("/driver", h.GetDriver).Methods("GET")
	r.HandleFunc("/driver", h.UpdateDriver).Methods("PUT")
	r.HandleFunc("/driver/{id}", h.GetDriverByID).Methods("GET")
	r.HandleFunc("/driver/location", h.UpdateLocation).Methods("PUT")
	r.HandleFunc("/driver/availability", h.ToggleAvailability).Methods("PUT")
	r.HandleFunc("/driver/vehicle", h.AddVehicle).Methods("POST")
	r.HandleFunc("/drivers/available", h.GetAvailableDrivers).Methods("GET")
	r.HandleFunc("/health", h.Health).Methods("GET")
}

func (h *Handler) getUserID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.Header.Get("X-User-ID"))
}

func (h *Handler) getRequestID(r *http.Request) string {
	if id, ok := r.Context().Value("request_id").(string); ok {
		return id
	}
	return ""
}

func (h *Handler) CreateDriver(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.CreateDriverRequest
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

	driver, err := h.svc.CreateDriver(userID, &req)
	if err != nil {
		response.InternalServerError(w, "create failed", err.Error(), reqID)
		return
	}

	response.Created(w, driver, reqID)
}

func (h *Handler) GetDriver(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	driver, err := h.svc.GetDriver(userID)
	if err == repository.ErrNotFound {
		response.NotFound(w, "driver not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}

	response.Success(w, driver, reqID)
}

func (h *Handler) GetDriverByID(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	driver, err := h.svc.GetDriverByID(id)
	if err == repository.ErrNotFound {
		response.NotFound(w, "driver not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}

	response.Success(w, driver, reqID)
}

func (h *Handler) UpdateDriver(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.UpdateDriverRequest
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

	driver, err := h.svc.UpdateDriver(userID, &req)
	if err == repository.ErrNotFound {
		response.NotFound(w, "driver not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}

	response.Success(w, driver, reqID)
}

func (h *Handler) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.UpdateLocationRequest
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

	if err := h.svc.UpdateLocation(userID, &req); err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}

	response.Success(w, map[string]string{"message": "location updated"}, reqID)
}

func (h *Handler) AddVehicle(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.AddVehicleRequest
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

	vehicle, err := h.svc.AddVehicle(userID, &req)
	if err != nil {
		response.InternalServerError(w, "add failed", err.Error(), reqID)
		return
	}

	response.Created(w, vehicle, reqID)
}

func (h *Handler) ToggleAvailability(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req struct {
		IsAvailable bool `json:"is_available"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request", err.Error(), reqID)
		return
	}

	driver, err := h.svc.UpdateDriver(userID, &model.UpdateDriverRequest{IsAvailable: &req.IsAvailable})
	if err == repository.ErrNotFound {
		response.NotFound(w, "driver not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}

	response.Success(w, driver, reqID)
}

func (h *Handler) GetAvailableDrivers(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	vehicleType := r.URL.Query().Get("type")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	drivers, err := h.svc.GetAvailableDrivers(vehicleType, limit)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}

	response.Success(w, drivers, reqID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	response.Success(w, map[string]string{"status": "healthy", "service": "driver-service"}, reqID)
}
