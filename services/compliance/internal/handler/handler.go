package handler

import (
	"context"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/compliance/internal/model"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	CreatePolicy(ctx context.Context, userID uuid.UUID, req *model.CreatePolicyRequest) (*model.InsurancePolicy, error)
	GetPolicy(ctx context.Context, id uuid.UUID) (*model.InsurancePolicy, error)
	GetUserPolicies(ctx context.Context, userID uuid.UUID) ([]model.InsurancePolicy, error)
	GetExpiringPolicies(ctx context.Context, days int) ([]model.InsurancePolicy, error)
	VerifyPolicy(ctx context.Context, id, verifiedBy uuid.UUID, approve bool) error
	CreateClaim(ctx context.Context, userID uuid.UUID, req *model.CreateClaimRequest) (*model.InsuranceClaim, error)
	GetClaim(ctx context.Context, id uuid.UUID) (*model.InsuranceClaim, error)
	GetUserClaims(ctx context.Context, userID uuid.UUID) ([]model.InsuranceClaim, error)
	GetPolicyClaims(ctx context.Context, policyID uuid.UUID) ([]model.InsuranceClaim, error)
	UpdateClaimStatus(ctx context.Context, id uuid.UUID, req *model.UpdateClaimStatusRequest) error
	AddClaimDocument(ctx context.Context, claimID uuid.UUID, docID string) error
}

type Handler struct {
	svc ServiceInterface
	val *validator.Validator
}

func New(svc ServiceInterface) *Handler {
	return &Handler{svc: svc, val: validator.New()}
}

func (h *Handler) RegisterRoutes(r *mux.Router) {
	// Policies
	r.HandleFunc("/insurance/policies", h.CreatePolicy).Methods("POST")
	r.HandleFunc("/insurance/policies", h.GetMyPolicies).Methods("GET")
	r.HandleFunc("/insurance/policies/expiring", h.GetExpiringPolicies).Methods("GET")
	r.HandleFunc("/insurance/policies/{id}", h.GetPolicy).Methods("GET")
	r.HandleFunc("/insurance/policies/{id}/verify", h.VerifyPolicy).Methods("POST")
	// Claims
	r.HandleFunc("/insurance/claims", h.CreateClaim).Methods("POST")
	r.HandleFunc("/insurance/claims", h.GetMyClaims).Methods("GET")
	r.HandleFunc("/insurance/claims/{id}", h.GetClaim).Methods("GET")
	r.HandleFunc("/insurance/claims/{id}/status", h.UpdateClaimStatus).Methods("PUT")
	r.HandleFunc("/insurance/claims/{id}/documents", h.AddClaimDocument).Methods("POST")
	r.HandleFunc("/insurance/policies/{id}/claims", h.GetPolicyClaims).Methods("GET")
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

func (h *Handler) CreatePolicy(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.CreatePolicyRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "validation error", err.Error(), reqID)
		return
	}

	policy, err := h.svc.CreatePolicy(r.Context(), userID, &req)
	if err != nil {
		response.InternalServerError(w, "create failed", err.Error(), reqID)
		return
	}
	response.Created(w, policy, reqID)
}

func (h *Handler) GetPolicy(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	policy, err := h.svc.GetPolicy(r.Context(), id)
	if err != nil || policy == nil {
		response.NotFound(w, "policy not found", "", reqID)
		return
	}
	response.Success(w, policy, reqID)
}

func (h *Handler) GetMyPolicies(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	policies, err := h.svc.GetUserPolicies(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}
	if policies == nil {
		policies = []model.InsurancePolicy{}
	}
	response.Success(w, policies, reqID)
}

func (h *Handler) GetExpiringPolicies(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days == 0 {
		days = 30
	}

	policies, err := h.svc.GetExpiringPolicies(r.Context(), days)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}
	if policies == nil {
		policies = []model.InsurancePolicy{}
	}
	response.Success(w, policies, reqID)
}

func (h *Handler) VerifyPolicy(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	var req struct {
		Approve bool `json:"approve"`
	}
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "validation error", err.Error(), reqID)
		return
	}

	if err := h.svc.VerifyPolicy(r.Context(), id, userID, req.Approve); err != nil {
		response.InternalServerError(w, "verify failed", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "policy verified"}, reqID)
}

func (h *Handler) CreateClaim(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.CreateClaimRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "validation error", err.Error(), reqID)
		return
	}

	claim, err := h.svc.CreateClaim(r.Context(), userID, &req)
	if err != nil {
		response.BadRequest(w, err.Error(), "", reqID)
		return
	}
	response.Created(w, claim, reqID)
}

func (h *Handler) GetClaim(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	claim, err := h.svc.GetClaim(r.Context(), id)
	if err != nil || claim == nil {
		response.NotFound(w, "claim not found", "", reqID)
		return
	}
	response.Success(w, claim, reqID)
}

func (h *Handler) GetMyClaims(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	claims, err := h.svc.GetUserClaims(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}
	if claims == nil {
		claims = []model.InsuranceClaim{}
	}
	response.Success(w, claims, reqID)
}

func (h *Handler) GetPolicyClaims(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	claims, err := h.svc.GetPolicyClaims(r.Context(), id)
	if err != nil {
		response.InternalServerError(w, "fetch failed", err.Error(), reqID)
		return
	}
	if claims == nil {
		claims = []model.InsuranceClaim{}
	}
	response.Success(w, claims, reqID)
}

func (h *Handler) UpdateClaimStatus(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	var req model.UpdateClaimStatusRequest
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "validation error", err.Error(), reqID)
		return
	}

	if err := h.svc.UpdateClaimStatus(r.Context(), id, &req); err != nil {
		response.InternalServerError(w, "update failed", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "claim updated"}, reqID)
}

func (h *Handler) AddClaimDocument(w http.ResponseWriter, r *http.Request) {
	reqID := h.reqID(r)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "invalid id", "", reqID)
		return
	}

	var req struct {
		DocumentID string `json:"document_id" validate:"required"`
	}
	if err := h.val.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "validation error", err.Error(), reqID)
		return
	}

	if err := h.svc.AddClaimDocument(r.Context(), id, req.DocumentID); err != nil {
		response.InternalServerError(w, "add failed", err.Error(), reqID)
		return
	}
	response.Success(w, map[string]string{"message": "document added"}, reqID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	response.Success(w, map[string]string{"status": "healthy", "service": "compliance-service"}, h.reqID(r))
}
