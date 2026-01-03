package handler

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/fleet/internal/model"
	"truckify/services/fleet/internal/repository"
	"truckify/services/fleet/internal/service"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type Handler struct {
	svc *service.Service
	val *validator.Validator
}

func New(svc *service.Service) *Handler {
	return &Handler{svc: svc, val: validator.New()}
}

func (h *Handler) RegisterRoutes(r *mux.Router) {
	// Vehicle management (more specific routes first)
	r.HandleFunc("/fleet/vehicles/{id}/assign", h.AssignVehicle).Methods("POST")
	r.HandleFunc("/fleet/vehicles/{id}/unassign", h.UnassignVehicle).Methods("POST")
	r.HandleFunc("/fleet/vehicles/{id}", h.GetVehicle).Methods("GET")
	r.HandleFunc("/fleet/vehicles", h.CreateVehicle).Methods("POST")
	r.HandleFunc("/fleet/vehicles", h.GetFleetVehicles).Methods("GET")

	// Driver management
	r.HandleFunc("/fleet/drivers/{id}", h.RemoveDriver).Methods("DELETE")
	r.HandleFunc("/fleet/drivers", h.AddDriver).Methods("POST")
	r.HandleFunc("/fleet/drivers", h.GetFleetDrivers).Methods("GET")

	// Fleet management
	r.HandleFunc("/fleet/{id}", h.GetFleet).Methods("GET")
	r.HandleFunc("/fleet", h.CreateFleet).Methods("POST")
	r.HandleFunc("/fleet", h.GetMyFleet).Methods("GET")

	// Handover
	r.HandleFunc("/handover/{id}/accept", h.AcceptHandover).Methods("POST")
	r.HandleFunc("/handover/{id}/reject", h.RejectHandover).Methods("POST")
	r.HandleFunc("/handover/request", h.RequestHandover).Methods("POST")
	r.HandleFunc("/handover/pending", h.GetPendingHandovers).Methods("GET")

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

func (h *Handler) CreateFleet(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.CreateFleetRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "invalid request", err.Error(), reqID)
		return
	}

	fleet, err := h.svc.CreateFleet(userID, &req)
	if err != nil {
		response.InternalServerError(w, "failed to create fleet", err.Error(), reqID)
		return
	}
	response.Created(w, fleet, reqID)
}

func (h *Handler) GetMyFleet(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	fleet, err := h.svc.GetMyFleet(userID)
	if err == repository.ErrNotFound {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "failed to get fleet", err.Error(), reqID)
		return
	}
	response.Success(w, fleet, reqID)
}

func (h *Handler) GetFleet(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid fleet id", "", reqID)
		return
	}

	fleet, err := h.svc.GetFleet(id)
	if err == repository.ErrNotFound {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "failed to get fleet", err.Error(), reqID)
		return
	}
	response.Success(w, fleet, reqID)
}

func (h *Handler) CreateVehicle(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	fleet, err := h.svc.GetMyFleet(userID)
	if err != nil {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}

	var req model.CreateVehicleRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "invalid request", err.Error(), reqID)
		return
	}

	vehicle, err := h.svc.CreateVehicle(fleet.ID, &req)
	if err != nil {
		response.InternalServerError(w, "failed to create vehicle", err.Error(), reqID)
		return
	}
	response.Created(w, vehicle, reqID)
}

func (h *Handler) GetFleetVehicles(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	fleet, err := h.svc.GetMyFleet(userID)
	if err != nil {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}

	vehicles, err := h.svc.GetFleetVehicles(fleet.ID)
	if err != nil {
		response.InternalServerError(w, "failed to get vehicles", err.Error(), reqID)
		return
	}
	if vehicles == nil {
		vehicles = []*model.FleetVehicle{}
	}
	response.Success(w, vehicles, reqID)
}

func (h *Handler) GetVehicle(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid vehicle id", "", reqID)
		return
	}

	vehicle, err := h.svc.GetVehicle(id)
	if err == repository.ErrNotFound {
		response.NotFound(w, "vehicle not found", "", reqID)
		return
	}
	if err != nil {
		response.InternalServerError(w, "failed to get vehicle", err.Error(), reqID)
		return
	}
	response.Success(w, vehicle, reqID)
}

func (h *Handler) AssignVehicle(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	vehicleID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid vehicle id", "", reqID)
		return
	}

	fleet, err := h.svc.GetMyFleet(userID)
	if err != nil {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}

	var req model.AssignVehicleRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "invalid request", err.Error(), reqID)
		return
	}

	if err := h.svc.AssignVehicle(vehicleID, req.DriverID, fleet.ID); err != nil {
		if err == repository.ErrUnauthorized {
			response.Forbidden(w, "driver not in fleet", "", reqID)
			return
		}
		response.InternalServerError(w, "failed to assign vehicle", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "vehicle assigned"}, reqID)
}

func (h *Handler) UnassignVehicle(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	vehicleID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid vehicle id", "", reqID)
		return
	}

	// Verify ownership
	fleet, err := h.svc.GetMyFleet(userID)
	if err != nil {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}

	vehicle, err := h.svc.GetVehicle(vehicleID)
	if err != nil || vehicle.FleetID != fleet.ID {
		response.Forbidden(w, "not your vehicle", "", reqID)
		return
	}

	if err := h.svc.UnassignVehicle(vehicleID); err != nil {
		response.InternalServerError(w, "failed to unassign vehicle", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "vehicle unassigned"}, reqID)
}

func (h *Handler) AddDriver(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	fleet, err := h.svc.GetMyFleet(userID)
	if err != nil {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}

	var req model.AddDriverRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "invalid request", err.Error(), reqID)
		return
	}

	driver, err := h.svc.AddDriver(fleet.ID, &req)
	if err != nil {
		response.InternalServerError(w, "failed to add driver", err.Error(), reqID)
		return
	}
	response.Created(w, driver, reqID)
}

func (h *Handler) GetFleetDrivers(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	fleet, err := h.svc.GetMyFleet(userID)
	if err != nil {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}

	drivers, err := h.svc.GetFleetDrivers(fleet.ID)
	if err != nil {
		response.InternalServerError(w, "failed to get drivers", err.Error(), reqID)
		return
	}
	if drivers == nil {
		drivers = []*model.FleetDriver{}
	}
	response.Success(w, drivers, reqID)
}

func (h *Handler) RemoveDriver(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	driverID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid driver id", "", reqID)
		return
	}

	fleet, err := h.svc.GetMyFleet(userID)
	if err != nil {
		response.NotFound(w, "fleet not found", "", reqID)
		return
	}

	if err := h.svc.RemoveDriver(fleet.ID, driverID); err != nil {
		response.InternalServerError(w, "failed to remove driver", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "driver removed"}, reqID)
}

func (h *Handler) RequestHandover(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.HandoverRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "invalid request", err.Error(), reqID)
		return
	}

	// Get current driver from vehicle
	vehicle, err := h.svc.GetVehicle(req.VehicleID)
	if err != nil {
		response.NotFound(w, "vehicle not found", "", reqID)
		return
	}

	var fromDriverID *uuid.UUID
	if vehicle.CurrentDriverID != nil {
		fromDriverID = vehicle.CurrentDriverID
		// Only current driver or fleet owner can request handover
		fleet, _ := h.svc.GetFleet(vehicle.FleetID)
		if *vehicle.CurrentDriverID != userID && fleet.OwnerID != userID {
			response.Forbidden(w, "not authorized", "", reqID)
			return
		}
	}

	handover, err := h.svc.RequestHandover(&req, fromDriverID)
	if err != nil {
		response.InternalServerError(w, "failed to request handover", err.Error(), reqID)
		return
	}
	response.Created(w, handover, reqID)
}

func (h *Handler) GetPendingHandovers(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	handovers, err := h.svc.GetPendingHandovers(userID)
	if err != nil {
		response.InternalServerError(w, "failed to get handovers", err.Error(), reqID)
		return
	}
	if handovers == nil {
		handovers = []*model.VehicleHandover{}
	}
	response.Success(w, handovers, reqID)
}

func (h *Handler) AcceptHandover(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	handoverID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid handover id", "", reqID)
		return
	}

	if err := h.svc.AcceptHandover(handoverID, userID); err != nil {
		if err == repository.ErrUnauthorized {
			response.Forbidden(w, "not authorized", "", reqID)
			return
		}
		response.InternalServerError(w, "failed to accept handover", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "handover accepted"}, reqID)
}

func (h *Handler) RejectHandover(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	handoverID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid handover id", "", reqID)
		return
	}

	if err := h.svc.RejectHandover(handoverID, userID); err != nil {
		if err == repository.ErrUnauthorized {
			response.Forbidden(w, "not authorized", "", reqID)
			return
		}
		response.InternalServerError(w, "failed to reject handover", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "handover rejected"}, reqID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	reqID := h.getRequestID(r)
	response.Success(w, map[string]string{"status": "healthy", "service": "fleet-service"}, reqID)
}
