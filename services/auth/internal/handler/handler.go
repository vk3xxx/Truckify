package handler

import (
	"context"
	"net/http"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/auth/internal/model"
	"truckify/services/auth/internal/repository"
	"truckify/services/auth/internal/service"
	"truckify/shared/pkg/jwt"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

// ServiceInterface defines the interface for auth service operations
type ServiceInterface interface {
	Register(ctx context.Context, req *model.RegisterRequest) (*model.LoginResponse, error)
	Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error)
	RefreshToken(ctx context.Context, refreshToken string) (*jwt.TokenPair, error)
	ChangePassword(ctx context.Context, userID uuid.UUID, req *model.ChangePasswordRequest) error
	ForgotPassword(ctx context.Context, req *model.ForgotPasswordRequest) error
	ResetPassword(ctx context.Context, req *model.ResetPasswordRequest) error
	VerifyEmail(ctx context.Context, req *model.VerifyEmailRequest) error
	// Passkey methods
	BeginPasskeyRegistration(ctx context.Context, userID uuid.UUID) (*protocol.CredentialCreation, error)
	FinishPasskeyRegistration(ctx context.Context, userID uuid.UUID, name, response string) (*model.PasskeyCredential, error)
	BeginPasskeyLogin(ctx context.Context, email string) (*protocol.CredentialAssertion, error)
	FinishPasskeyLogin(ctx context.Context, email, response string) (*model.LoginResponse, error)
	GetUserPasskeys(ctx context.Context, userID uuid.UUID) ([]model.PasskeyCredential, error)
	DeletePasskey(ctx context.Context, userID, passkeyID uuid.UUID) error
	// Admin methods
	ListUsers(ctx context.Context) ([]model.User, error)
	UpdateUserStatus(ctx context.Context, userID uuid.UUID, status string) error
}

// Handler handles HTTP requests for auth
type Handler struct {
	service   ServiceInterface
	validator *validator.Validator
	logger    *logger.Logger
}

// New creates a new handler instance
func New(service ServiceInterface, logger *logger.Logger) *Handler {
	return &Handler{
		service:   service,
		validator: validator.New(),
		logger:    logger,
	}
}

// RegisterRoutes registers all auth routes
func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/register", h.Register).Methods(http.MethodPost)
	router.HandleFunc("/login", h.Login).Methods(http.MethodPost)
	router.HandleFunc("/refresh", h.RefreshToken).Methods(http.MethodPost)
	router.HandleFunc("/change-password", h.ChangePassword).Methods(http.MethodPost)
	router.HandleFunc("/forgot-password", h.ForgotPassword).Methods(http.MethodPost)
	router.HandleFunc("/reset-password", h.ResetPassword).Methods(http.MethodPost)
	router.HandleFunc("/verify-email", h.VerifyEmail).Methods(http.MethodPost)
	router.HandleFunc("/health", h.Health).Methods(http.MethodGet)
}

// Register handles user registration
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.RegisterRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	result, err := h.service.Register(r.Context(), &req)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Created(w, result, requestID)
}

// Login handles user login
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.LoginRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	result, err := h.service.Login(r.Context(), &req)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, result, requestID)
}

// RefreshToken handles token refresh
func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.RefreshTokenRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	tokens, err := h.service.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, tokens, requestID)
}

// ChangePassword handles password change
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	// Get user ID from context (set by API gateway)
	userIDStr := r.Header.Get("X-User-ID")
	if userIDStr == "" {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid user ID", err.Error(), requestID)
		return
	}

	var req model.ChangePasswordRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	if err := h.service.ChangePassword(r.Context(), userID, &req); err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Password changed successfully"}, requestID)
}

// ForgotPassword handles forgot password requests
func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.ForgotPasswordRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	if err := h.service.ForgotPassword(r.Context(), &req); err != nil {
		h.logger.Error("Forgot password error", "error", err)
		// Always return success to prevent email enumeration
	}

	response.Success(w, map[string]string{"message": "If the email exists, a reset link has been sent"}, requestID)
}

// ResetPassword handles password reset
func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.ResetPasswordRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	if err := h.service.ResetPassword(r.Context(), &req); err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Password reset successfully"}, requestID)
}

// VerifyEmail handles email verification
func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	var req model.VerifyEmailRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	if err := h.service.VerifyEmail(r.Context(), &req); err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Email verified successfully"}, requestID)
}

// Health handles health check requests
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	response.Success(w, map[string]interface{}{
		"status":  "healthy",
		"service": "auth-service",
	}, requestID)
}

// handleError handles service errors and returns appropriate HTTP responses
func (h *Handler) handleError(w http.ResponseWriter, err error, requestID string) {
	switch err {
	case service.ErrInvalidCredentials:
		response.Unauthorized(w, "Invalid credentials", "", requestID)
	case service.ErrUserNotActive:
		response.Forbidden(w, "User account is not active", "", requestID)
	case repository.ErrEmailAlreadyExists:
		response.Conflict(w, "Email already exists", "", requestID)
	case repository.ErrUserNotFound:
		response.NotFound(w, "User not found", "", requestID)
	default:
		h.logger.Error("Internal error", "error", err)
		response.InternalServerError(w, "Internal server error", "", requestID)
	}
}

// Exported errors for testing
var (
	ErrInvalidCredentials = service.ErrInvalidCredentials
	ErrUserNotActive      = service.ErrUserNotActive
)
