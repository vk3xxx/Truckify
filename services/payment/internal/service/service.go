package service

import (
	"context"
	"errors"
	"math"
	"strconv"
	"time"

	"github.com/google/uuid"
	"truckify/services/payment/internal/model"
	"truckify/services/payment/internal/repository"
)

var (
	ErrPaymentNotFound = errors.New("payment not found")
	ErrInvalidStatus   = errors.New("invalid payment status for this operation")
	ErrTierNotFound    = errors.New("subscription tier not found")
)

type Service struct{ repo *repository.Repository }

func New(repo *repository.Repository) *Service { return &Service{repo: repo} }

func (s *Service) CreatePayment(ctx context.Context, req model.CreatePaymentRequest) (*model.Payment, error) {
	// Calculate fees based on payee's subscription
	calc, _ := s.CalculateFees(ctx, req.PayeeID, req.Amount)
	
	p := &model.Payment{
		ID:           uuid.New(),
		JobID:        req.JobID,
		PayerID:      req.PayerID,
		PayeeID:      req.PayeeID,
		Amount:       req.Amount,
		PlatformFee:  calc.PlatformFee,
		DriverPayout: calc.DriverPayout,
		Status:       model.StatusPending,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Service) GetPayment(ctx context.Context, id uuid.UUID) (*model.Payment, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrPaymentNotFound
	}
	return p, nil
}

func (s *Service) ProcessPayment(ctx context.Context, id uuid.UUID) (*model.Payment, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil || p == nil {
		return nil, ErrPaymentNotFound
	}
	if p.Status != model.StatusPending {
		return nil, ErrInvalidStatus
	}
	if err := s.repo.UpdateStatus(ctx, id, model.StatusCompleted); err != nil {
		return nil, err
	}
	p.Status = model.StatusCompleted
	return p, nil
}

func (s *Service) RefundPayment(ctx context.Context, id uuid.UUID) (*model.Payment, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil || p == nil {
		return nil, ErrPaymentNotFound
	}
	if p.Status != model.StatusCompleted {
		return nil, ErrInvalidStatus
	}
	if err := s.repo.UpdateStatus(ctx, id, model.StatusRefunded); err != nil {
		return nil, err
	}
	p.Status = model.StatusRefunded
	return p, nil
}

// Subscription & Pricing
func (s *Service) GetSubscriptionTiers(ctx context.Context) ([]model.SubscriptionTier, error) {
	return s.repo.GetSubscriptionTiers(ctx)
}

func (s *Service) GetUserSubscription(ctx context.Context, userID uuid.UUID) (*model.Subscription, error) {
	return s.repo.GetUserSubscription(ctx, userID)
}

func (s *Service) Subscribe(ctx context.Context, userID uuid.UUID, req model.SubscribeRequest) (*model.Subscription, error) {
	tier, err := s.repo.GetSubscriptionTier(ctx, req.TierID)
	if err != nil || tier == nil {
		return nil, ErrTierNotFound
	}

	// Cancel existing subscription
	s.repo.CancelSubscription(ctx, userID)

	var expiresAt time.Time
	if req.Annual {
		expiresAt = time.Now().AddDate(1, 0, 0)
	} else {
		expiresAt = time.Now().AddDate(0, 1, 0)
	}

	sub := &model.Subscription{
		ID:        uuid.New(),
		UserID:    userID,
		TierID:    req.TierID,
		TierName:  tier.Name,
		Status:    "active",
		StartedAt: time.Now(),
		ExpiresAt: &expiresAt,
		AutoRenew: true,
	}

	if err := s.repo.CreateSubscription(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *Service) CancelSubscription(ctx context.Context, userID uuid.UUID) error {
	return s.repo.CancelSubscription(ctx, userID)
}

func (s *Service) CancelSubscriptionByStripeID(ctx context.Context, stripeSubID string) error {
	return s.repo.CancelSubscriptionByStripeID(ctx, stripeSubID)
}

func (s *Service) GetSubscriptionTier(ctx context.Context, id uuid.UUID) (*model.SubscriptionTier, error) {
	return s.repo.GetSubscriptionTier(ctx, id)
}

func (s *Service) ActivateSubscription(ctx context.Context, userID, tierID uuid.UUID, stripeSubID string, annual bool) (*model.Subscription, error) {
	tier, err := s.repo.GetSubscriptionTier(ctx, tierID)
	if err != nil || tier == nil {
		return nil, ErrTierNotFound
	}

	// Cancel existing subscription
	s.repo.CancelSubscription(ctx, userID)

	var expiresAt time.Time
	if annual {
		expiresAt = time.Now().AddDate(1, 0, 0)
	} else {
		expiresAt = time.Now().AddDate(0, 1, 0)
	}

	sub := &model.Subscription{
		ID:                   uuid.New(),
		UserID:               userID,
		TierID:               tierID,
		TierName:             tier.Name,
		StripeSubscriptionID: stripeSubID,
		Status:               "active",
		StartedAt:            time.Now(),
		ExpiresAt:            &expiresAt,
		AutoRenew:            true,
	}

	if err := s.repo.CreateSubscription(ctx, sub); err != nil {
		return nil, err
	}
	return sub, nil
}

func (s *Service) CalculateFees(ctx context.Context, driverID uuid.UUID, jobAmount float64) (*model.FeeCalculation, error) {
	calc := &model.FeeCalculation{
		JobAmount:        jobAmount,
		BaseRate:         15.0, // Default free tier rate
		SubscriptionTier: "free",
	}

	// Get driver's subscription
	sub, _ := s.repo.GetUserSubscription(ctx, driverID)
	if sub != nil {
		tier, _ := s.repo.GetSubscriptionTier(ctx, sub.TierID)
		if tier != nil {
			calc.BaseRate = tier.BaseCommissionRate
			calc.SubscriptionTier = tier.Name
		}
	}

	// Get job value discount
	commTiers, _ := s.repo.GetCommissionTiers(ctx)
	for _, ct := range commTiers {
		if jobAmount >= ct.MinJobValue && (ct.MaxJobValue == nil || jobAmount <= *ct.MaxJobValue) {
			calc.JobValueDiscount = ct.RateDiscount
			break
		}
	}

	// Calculate effective rate
	calc.EffectiveRate = math.Max(calc.BaseRate-calc.JobValueDiscount, 0)
	calc.PlatformFee = jobAmount * calc.EffectiveRate / 100

	// Apply minimum fee
	minFeeStr, _ := s.repo.GetSetting(ctx, "minimum_platform_fee")
	if minFee, err := strconv.ParseFloat(minFeeStr, 64); err == nil && calc.PlatformFee < minFee {
		calc.PlatformFee = minFee
	}

	calc.PlatformFee = math.Round(calc.PlatformFee*100) / 100
	calc.DriverPayout = math.Round((jobAmount-calc.PlatformFee)*100) / 100

	return calc, nil
}

func (s *Service) GetCommissionTiers(ctx context.Context) ([]model.CommissionTier, error) {
	return s.repo.GetCommissionTiers(ctx)
}
