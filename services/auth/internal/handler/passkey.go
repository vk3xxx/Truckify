package handler

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/auth/internal/model"
	"truckify/services/auth/internal/service"
	"truckify/shared/pkg/response"
)

// RegisterPasskeyRoutes adds passkey routes
func (h *Handler) RegisterPasskeyRoutes(router *mux.Router) {
	router.HandleFunc("/passkey/register/begin", h.BeginPasskeyRegistration).Methods(http.MethodPost)
	router.HandleFunc("/passkey/register/finish", h.FinishPasskeyRegistration).Methods(http.MethodPost)
	router.HandleFunc("/passkey/login/begin", h.BeginPasskeyLogin).Methods(http.MethodPost)
	router.HandleFunc("/passkey/login/finish", h.FinishPasskeyLogin).Methods(http.MethodPost)
	router.HandleFunc("/passkeys", h.GetUserPasskeys).Methods(http.MethodGet)
	router.HandleFunc("/passkeys/{id}", h.DeletePasskey).Methods(http.MethodDelete)
}

func (h *Handler) BeginPasskeyRegistration(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid user ID", "", requestID)
		return
	}

	options, err := h.service.BeginPasskeyRegistration(r.Context(), userID)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, options, requestID)
}

func (h *Handler) FinishPasskeyRegistration(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid user ID", "", requestID)
		return
	}

	var req model.FinishPasskeyRegistrationRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	cred, err := h.service.FinishPasskeyRegistration(r.Context(), userID, req.Name, req.Response)
	if err != nil {
		h.handlePasskeyError(w, err, requestID)
		return
	}

	response.Created(w, model.PasskeyCredentialResponse{
		ID:        cred.ID,
		Name:      cred.Name,
		CreatedAt: cred.CreatedAt,
	}, requestID)
}

func (h *Handler) BeginPasskeyLogin(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.BeginPasskeyLoginRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	options, err := h.service.BeginPasskeyLogin(r.Context(), req.Email)
	if err != nil {
		h.handlePasskeyError(w, err, requestID)
		return
	}

	response.Success(w, options, requestID)
}

func (h *Handler) FinishPasskeyLogin(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.FinishPasskeyLoginRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	result, err := h.service.FinishPasskeyLogin(r.Context(), req.Email, req.Response)
	if err != nil {
		h.handlePasskeyError(w, err, requestID)
		return
	}

	response.Success(w, result, requestID)
}

func (h *Handler) GetUserPasskeys(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid user ID", "", requestID)
		return
	}

	passkeys, err := h.service.GetUserPasskeys(r.Context(), userID)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	var resp []model.PasskeyCredentialResponse
	for _, p := range passkeys {
		resp = append(resp, model.PasskeyCredentialResponse{
			ID:        p.ID,
			Name:      p.Name,
			CreatedAt: p.CreatedAt,
			LastUsed:  p.LastUsedAt,
		})
	}

	response.Success(w, resp, requestID)
}

func (h *Handler) DeletePasskey(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid user ID", "", requestID)
		return
	}

	passkeyID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid passkey ID", "", requestID)
		return
	}

	if err := h.service.DeletePasskey(r.Context(), userID, passkeyID); err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Passkey deleted"}, requestID)
}

func (h *Handler) handlePasskeyError(w http.ResponseWriter, err error, requestID string) {
	switch err {
	case service.ErrInvalidChallenge:
		response.BadRequest(w, "Invalid or expired challenge", "", requestID)
	case service.ErrNoPasskeysForUser:
		response.NotFound(w, "No passkeys registered for this user", "", requestID)
	case service.ErrInvalidCredentials:
		response.Unauthorized(w, "Invalid credentials", "", requestID)
	default:
		h.handleError(w, err, requestID)
	}
}
