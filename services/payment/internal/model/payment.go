package model

import (
	"time"
	"github.com/google/uuid"
)

type PaymentStatus string

const (
	StatusPending   PaymentStatus = "pending"
	StatusCompleted PaymentStatus = "completed"
	StatusFailed    PaymentStatus = "failed"
	StatusRefunded  PaymentStatus = "refunded"
)

type Payment struct {
	ID          uuid.UUID     `json:"id" db:"id"`
	JobID       uuid.UUID     `json:"job_id" db:"job_id"`
	PayerID     uuid.UUID     `json:"payer_id" db:"payer_id"`
	PayeeID     uuid.UUID     `json:"payee_id" db:"payee_id"`
	Amount      float64       `json:"amount" db:"amount"`
	PlatformFee float64       `json:"platform_fee" db:"platform_fee"`
	DriverPayout float64      `json:"driver_payout" db:"driver_payout"`
	Status      PaymentStatus `json:"status" db:"status"`
	CreatedAt   time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at" db:"updated_at"`
}

type CreatePaymentRequest struct {
	JobID   uuid.UUID `json:"job_id" validate:"required"`
	PayerID uuid.UUID `json:"payer_id" validate:"required"`
	PayeeID uuid.UUID `json:"payee_id" validate:"required"`
	Amount  float64   `json:"amount" validate:"required,gt=0"`
}

type SubscriptionTier struct {
	ID                 uuid.UUID `json:"id"`
	Name               string    `json:"name"`
	MonthlyPrice       float64   `json:"monthly_price"`
	AnnualPrice        float64   `json:"annual_price"`
	BaseCommissionRate float64   `json:"base_commission_rate"`
	Description        string    `json:"description"`
	Features           []string  `json:"features"`
	IsActive           bool      `json:"is_active"`
}

type Subscription struct {
	ID                 uuid.UUID  `json:"id" db:"id"`
	UserID             uuid.UUID  `json:"user_id" db:"user_id"`
	TierID             uuid.UUID  `json:"tier_id" db:"tier_id"`
	TierName           string     `json:"tier_name,omitempty"`
	StripeSubscriptionID string   `json:"stripe_subscription_id,omitempty" db:"stripe_subscription_id"`
	Status             string     `json:"status" db:"status"`
	StartedAt          time.Time  `json:"started_at" db:"started_at"`
	ExpiresAt          *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	AutoRenew          bool       `json:"auto_renew" db:"auto_renew"`
}

type CommissionTier struct {
	ID           uuid.UUID `json:"id"`
	MinJobValue  float64   `json:"min_job_value"`
	MaxJobValue  *float64  `json:"max_job_value,omitempty"`
	RateDiscount float64   `json:"rate_discount"`
}

type FeeCalculation struct {
	JobAmount       float64 `json:"job_amount"`
	BaseRate        float64 `json:"base_rate"`
	JobValueDiscount float64 `json:"job_value_discount"`
	EffectiveRate   float64 `json:"effective_rate"`
	PlatformFee     float64 `json:"platform_fee"`
	DriverPayout    float64 `json:"driver_payout"`
	SubscriptionTier string `json:"subscription_tier"`
}

type SubscribeRequest struct {
	TierID  uuid.UUID `json:"tier_id" validate:"required"`
	Annual  bool      `json:"annual"`
}

type CheckoutRequest struct {
	JobID      uuid.UUID `json:"job_id" validate:"required"`
	SuccessURL string    `json:"success_url" validate:"required,url"`
	CancelURL  string    `json:"cancel_url" validate:"required,url"`
}

type SubscriptionCheckoutRequest struct {
	TierID     uuid.UUID `json:"tier_id" validate:"required"`
	Annual     bool      `json:"annual"`
	SuccessURL string    `json:"success_url" validate:"required,url"`
	CancelURL  string    `json:"cancel_url" validate:"required,url"`
}