package model

import (
	"time"

	"github.com/google/uuid"
)

type Match struct {
	ID        uuid.UUID `json:"id"`
	JobID     uuid.UUID `json:"job_id"`
	DriverID  uuid.UUID `json:"driver_id"`
	Score     float64   `json:"score"`
	Distance  float64   `json:"distance_km"`
	Status    string    `json:"status"` // pending, accepted, rejected, expired
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type MatchRequest struct {
	JobID       uuid.UUID `json:"job_id" validate:"required"`
	VehicleType string    `json:"vehicle_type" validate:"required"`
	PickupLat   float64   `json:"pickup_lat" validate:"required"`
	PickupLng   float64   `json:"pickup_lng" validate:"required"`
	MaxDistance float64   `json:"max_distance_km"` // default 100km
	Limit       int       `json:"limit"`           // default 10
}

type DriverCandidate struct {
	DriverID    uuid.UUID `json:"driver_id"`
	UserID      uuid.UUID `json:"user_id"`
	Rating      float64   `json:"rating"`
	TotalTrips  int       `json:"total_trips"`
	VehicleType string    `json:"vehicle_type"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	Distance    float64   `json:"distance_km"`
	Score       float64   `json:"score"`
}

type MatchResponse struct {
	JobID      uuid.UUID         `json:"job_id"`
	Candidates []DriverCandidate `json:"candidates"`
	MatchedAt  time.Time         `json:"matched_at"`
}

type UpdateMatchRequest struct {
	Status string `json:"status" validate:"required,oneof=accepted rejected"`
}
