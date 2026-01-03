package handler

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/shared/pkg/response"
)

// RegisterAdminRoutes registers admin-only routes
func (h *Handler) RegisterAdminRoutes(router *mux.Router) {
	router.HandleFunc("/admin/users", h.AdminListUsers).Methods(http.MethodGet)
	router.HandleFunc("/admin/users/{id}/status", h.AdminUpdateUserStatus).Methods(http.MethodPut)
}

func (h *Handler) AdminListUsers(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	
	userType := r.Header.Get("X-User-Type")
	if userType != "admin" {
		response.Forbidden(w, "Admin access required", "", reqID)
		return
	}

	users, err := h.service.ListUsers(r.Context())
	if err != nil {
		response.InternalServerError(w, "Failed to list users", "", reqID)
		return
	}

	response.Success(w, users, reqID)
}

func (h *Handler) AdminUpdateUserStatus(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	
	userType := r.Header.Get("X-User-Type")
	if userType != "admin" {
		response.Forbidden(w, "Admin access required", "", reqID)
		return
	}

	userID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid user ID", "", reqID)
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}

	if req.Status != "active" && req.Status != "suspended" && req.Status != "pending" {
		response.BadRequest(w, "Invalid status", "Must be active, suspended, or pending", reqID)
		return
	}

	if err := h.service.UpdateUserStatus(r.Context(), userID, req.Status); err != nil {
		response.InternalServerError(w, "Failed to update user", "", reqID)
		return
	}

	response.Success(w, map[string]string{"message": "User status updated"}, reqID)
}
