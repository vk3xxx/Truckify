package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/payment/internal/model"
	"truckify/services/payment/internal/service"
	stripeClient "truckify/services/payment/internal/stripe"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	CreatePayment(ctx context.Context, req model.CreatePaymentRequest) (*model.Payment, error)
	GetPayment(ctx context.Context, id uuid.UUID) (*model.Payment, error)
	ProcessPayment(ctx context.Context, id uuid.UUID) (*model.Payment, error)
	RefundPayment(ctx context.Context, id uuid.UUID) (*model.Payment, error)
	GetSubscriptionTiers(ctx context.Context) ([]model.SubscriptionTier, error)
	GetSubscriptionTier(ctx context.Context, id uuid.UUID) (*model.SubscriptionTier, error)
	GetUserSubscription(ctx context.Context, userID uuid.UUID) (*model.Subscription, error)
	Subscribe(ctx context.Context, userID uuid.UUID, req model.SubscribeRequest) (*model.Subscription, error)
	ActivateSubscription(ctx context.Context, userID, tierID uuid.UUID, stripeSubID string, annual bool) (*model.Subscription, error)
	CancelSubscription(ctx context.Context, userID uuid.UUID) error
	CancelSubscriptionByStripeID(ctx context.Context, stripeSubID string) error
	CalculateFees(ctx context.Context, driverID uuid.UUID, jobAmount float64) (*model.FeeCalculation, error)
	GetCommissionTiers(ctx context.Context) ([]model.CommissionTier, error)
}

type Handler struct {
	service   ServiceInterface
	validator *validator.Validator
	stripe    *stripeClient.Client
}

func New(svc ServiceInterface) *Handler {
	return &Handler{service: svc, validator: validator.New(), stripe: stripeClient.New()}
}

func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/payments", h.CreatePayment).Methods(http.MethodPost)
	router.HandleFunc("/payments/{id}", h.GetPayment).Methods(http.MethodGet)
	router.HandleFunc("/payments/{id}/process", h.ProcessPayment).Methods(http.MethodPost)
	router.HandleFunc("/payments/{id}/refund", h.RefundPayment).Methods(http.MethodPost)
	
	// Stripe endpoints
	router.HandleFunc("/checkout", h.CreateCheckout).Methods(http.MethodPost)
	router.HandleFunc("/checkout/subscription", h.CreateSubscriptionCheckout).Methods(http.MethodPost)
	router.HandleFunc("/webhook/stripe", h.StripeWebhook).Methods(http.MethodPost)
	
	// Pricing endpoints
	router.HandleFunc("/pricing/tiers", h.GetSubscriptionTiers).Methods(http.MethodGet)
	router.HandleFunc("/pricing/commission-tiers", h.GetCommissionTiers).Methods(http.MethodGet)
	router.HandleFunc("/pricing/calculate", h.CalculateFees).Methods(http.MethodPost)
	router.HandleFunc("/subscription", h.GetMySubscription).Methods(http.MethodGet)
	router.HandleFunc("/subscription", h.Subscribe).Methods(http.MethodPost)
	router.HandleFunc("/subscription", h.CancelSubscription).Methods(http.MethodDelete)
}

func (h *Handler) getUserID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.Header.Get("X-User-ID"))
}

func (h *Handler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	var req model.CreatePaymentRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	p, err := h.service.CreatePayment(r.Context(), req)
	if err != nil {
		response.InternalServerError(w, "Failed to create payment", "", reqID)
		return
	}
	response.Created(w, p, reqID)
}

func (h *Handler) GetPayment(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid payment ID", "", reqID)
		return
	}
	p, err := h.service.GetPayment(r.Context(), id)
	if err != nil {
		if err == service.ErrPaymentNotFound {
			response.NotFound(w, "Payment not found", "", reqID)
			return
		}
		response.InternalServerError(w, "Failed to get payment", "", reqID)
		return
	}
	response.Success(w, p, reqID)
}

func (h *Handler) ProcessPayment(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid payment ID", "", reqID)
		return
	}
	p, err := h.service.ProcessPayment(r.Context(), id)
	if err != nil {
		if err == service.ErrPaymentNotFound {
			response.NotFound(w, "Payment not found", "", reqID)
		} else if err == service.ErrInvalidStatus {
			response.Conflict(w, "Payment cannot be processed", "", reqID)
		} else {
			response.InternalServerError(w, "Failed to process payment", "", reqID)
		}
		return
	}
	response.Success(w, p, reqID)
}

func (h *Handler) RefundPayment(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid payment ID", "", reqID)
		return
	}
	p, err := h.service.RefundPayment(r.Context(), id)
	if err != nil {
		if err == service.ErrPaymentNotFound {
			response.NotFound(w, "Payment not found", "", reqID)
		} else if err == service.ErrInvalidStatus {
			response.Conflict(w, "Payment cannot be refunded", "", reqID)
		} else {
			response.InternalServerError(w, "Failed to refund payment", "", reqID)
		}
		return
	}
	response.Success(w, p, reqID)
}

func (h *Handler) GetSubscriptionTiers(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	tiers, err := h.service.GetSubscriptionTiers(r.Context())
	if err != nil {
		response.InternalServerError(w, "Failed to get tiers", "", reqID)
		return
	}
	if tiers == nil {
		tiers = []model.SubscriptionTier{}
	}
	response.Success(w, tiers, reqID)
}

func (h *Handler) GetCommissionTiers(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	tiers, err := h.service.GetCommissionTiers(r.Context())
	if err != nil {
		response.InternalServerError(w, "Failed to get commission tiers", "", reqID)
		return
	}
	if tiers == nil {
		tiers = []model.CommissionTier{}
	}
	response.Success(w, tiers, reqID)
}

func (h *Handler) GetMySubscription(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}
	sub, err := h.service.GetUserSubscription(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, "Failed to get subscription", "", reqID)
		return
	}
	if sub == nil {
		response.Success(w, map[string]string{"tier": "free", "status": "none"}, reqID)
		return
	}
	response.Success(w, sub, reqID)
}

func (h *Handler) Subscribe(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}
	var req model.SubscribeRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	sub, err := h.service.Subscribe(r.Context(), userID, req)
	if err != nil {
		if err == service.ErrTierNotFound {
			response.NotFound(w, "Tier not found", "", reqID)
			return
		}
		response.InternalServerError(w, "Failed to subscribe", "", reqID)
		return
	}
	response.Created(w, sub, reqID)
}

func (h *Handler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}
	if err := h.service.CancelSubscription(r.Context(), userID); err != nil {
		response.InternalServerError(w, "Failed to cancel", "", reqID)
		return
	}
	response.Success(w, map[string]string{"message": "subscription cancelled"}, reqID)
}

func (h *Handler) CalculateFees(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	var req struct {
		DriverID  uuid.UUID `json:"driver_id" validate:"required"`
		JobAmount float64   `json:"job_amount" validate:"required,gt=0"`
	}
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	calc, err := h.service.CalculateFees(r.Context(), req.DriverID, req.JobAmount)
	if err != nil {
		response.InternalServerError(w, "Failed to calculate fees", "", reqID)
		return
	}
	response.Success(w, calc, reqID)
}

func (h *Handler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.CheckoutRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}

	// Get job details from job service
	jobResp, err := http.Get(fmt.Sprintf("http://job-service:8006/jobs/%s", req.JobID))
	if err != nil || jobResp.StatusCode != 200 {
		response.BadRequest(w, "Job not found", "", reqID)
		return
	}
	defer jobResp.Body.Close()

	var jobData struct {
		Data struct {
			ID        string  `json:"id"`
			ShipperID string  `json:"shipper_id"`
			DriverID  string  `json:"driver_id"`
			Price     float64 `json:"price"`
			CargoType string  `json:"cargo_type"`
		} `json:"data"`
	}
	json.NewDecoder(jobResp.Body).Decode(&jobData)

	if jobData.Data.ShipperID != userID.String() {
		response.Forbidden(w, "Not authorized to pay for this job", "", reqID)
		return
	}

	driverID, _ := uuid.Parse(jobData.Data.DriverID)
	calc, _ := h.service.CalculateFees(r.Context(), driverID, jobData.Data.Price)

	sess, err := h.stripe.CreateCheckoutSession(stripeClient.CheckoutParams{
		JobID:       req.JobID.String(),
		PayerID:     userID.String(),
		PayeeID:     jobData.Data.DriverID,
		Amount:      int64(jobData.Data.Price * 100),
		PlatformFee: int64(calc.PlatformFee * 100),
		Description: fmt.Sprintf("Freight Job - %s", jobData.Data.CargoType),
		SuccessURL:  req.SuccessURL,
		CancelURL:   req.CancelURL,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to create checkout", err.Error(), reqID)
		return
	}

	response.Success(w, map[string]string{"checkout_url": sess.URL, "session_id": sess.ID}, reqID)
}

func (h *Handler) CreateSubscriptionCheckout(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}

	var req model.SubscriptionCheckoutRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}

	tier, err := h.service.GetSubscriptionTier(r.Context(), req.TierID)
	if err != nil || tier == nil {
		response.NotFound(w, "Tier not found", "", reqID)
		return
	}

	sess, err := h.stripe.CreateSubscriptionCheckout(stripeClient.SubscriptionParams{
		UserID:     userID.String(),
		TierID:     req.TierID.String(),
		TierName:   tier.Name,
		Amount:     int64(tier.MonthlyPrice * 100),
		Annual:     req.Annual,
		SuccessURL: req.SuccessURL,
		CancelURL:  req.CancelURL,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to create checkout", err.Error(), reqID)
		return
	}

	response.Success(w, map[string]string{"checkout_url": sess.URL, "session_id": sess.ID}, reqID)
}

func (h *Handler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	event, err := h.stripe.ParseWebhook(r)
	if err != nil {
		http.Error(w, "Invalid webhook", http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		if event.JobID != "" {
			// Job payment
			jobID, _ := uuid.Parse(event.JobID)
			payerID, _ := uuid.Parse(event.PayerID)
			payeeID, _ := uuid.Parse(event.PayeeID)
			h.service.CreatePayment(r.Context(), model.CreatePaymentRequest{
				JobID:   jobID,
				PayerID: payerID,
				PayeeID: payeeID,
				Amount:  float64(event.Amount) / 100,
			})
			http.Post(fmt.Sprintf("http://job-service:8006/jobs/%s/paid", event.JobID), "application/json", nil)
		} else if event.UserID != "" && event.TierID != "" {
			// Subscription payment
			userID, _ := uuid.Parse(event.UserID)
			tierID, _ := uuid.Parse(event.TierID)
			h.service.ActivateSubscription(r.Context(), userID, tierID, event.SubscriptionID, event.Annual)
		}

	case "customer.subscription.deleted":
		if event.SubscriptionID != "" {
			h.service.CancelSubscriptionByStripeID(r.Context(), event.SubscriptionID)
		}
	}

	w.WriteHeader(http.StatusOK)
}
