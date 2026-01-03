package model

import (
	"time"
	"github.com/google/uuid"
)

type BackhaulOpportunity struct {
	ID            uuid.UUID `json:"id" db:"id"`
	JobID         uuid.UUID `json:"job_id" db:"job_id"`
	OriginCity    string    `json:"origin_city" db:"origin_city"`
	OriginState   string    `json:"origin_state" db:"origin_state"`
	OriginLat     float64   `json:"origin_lat" db:"origin_lat"`
	OriginLng     float64   `json:"origin_lng" db:"origin_lng"`
	DestCity      string    `json:"dest_city" db:"dest_city"`
	DestState     string    `json:"dest_state" db:"dest_state"`
	DestLat       float64   `json:"dest_lat" db:"dest_lat"`
	DestLng       float64   `json:"dest_lng" db:"dest_lng"`
	VehicleType   string    `json:"vehicle_type" db:"vehicle_type"`
	PickupDate    time.Time `json:"pickup_date" db:"pickup_date"`
	Price         float64   `json:"price" db:"price"`
	Status        string    `json:"status" db:"status"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type FindBackhaulRequest struct {
	CurrentLat    float64 `json:"current_lat" validate:"required"`
	CurrentLng    float64 `json:"current_lng" validate:"required"`
	DestLat       float64 `json:"dest_lat" validate:"required"`
	DestLng       float64 `json:"dest_lng" validate:"required"`
	VehicleType   string  `json:"vehicle_type" validate:"required"`
	MaxDetourKm   float64 `json:"max_detour_km"`
}

type BackhaulMatch struct {
	Opportunity   BackhaulOpportunity `json:"opportunity"`
	DetourKm      float64             `json:"detour_km"`
	SavingsKm     float64             `json:"savings_km"`
	Score         float64             `json:"score"`
}
