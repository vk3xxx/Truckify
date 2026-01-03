package model

import (
	"time"

	"github.com/google/uuid"
)

type BidStatus string

const (
	BidStatusPending  BidStatus = "pending"
	BidStatusAccepted BidStatus = "accepted"
	BidStatusRejected BidStatus = "rejected"
	BidStatusExpired  BidStatus = "expired"
)

type Bid struct {
	ID        uuid.UUID `json:"id" db:"id"`
	JobID     uuid.UUID `json:"job_id" db:"job_id"`
	DriverID  uuid.UUID `json:"driver_id" db:"driver_id"`
	Amount    float64   `json:"amount" db:"amount"`
	Notes     string    `json:"notes,omitempty" db:"notes"`
	Status    BidStatus `json:"status" db:"status"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateBidRequest struct {
	JobID  uuid.UUID `json:"job_id" validate:"required"`
	Amount float64   `json:"amount" validate:"required,gt=0"`
	Notes  string    `json:"notes" validate:"max=500"`
}

type UpdateBidRequest struct {
	Amount float64 `json:"amount" validate:"required,gt=0"`
	Notes  string  `json:"notes" validate:"max=500"`
}
