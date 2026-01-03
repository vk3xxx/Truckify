package model

import (
	"time"

	"github.com/google/uuid"
)

type Fleet struct {
	ID        uuid.UUID `json:"id"`
	OwnerID   uuid.UUID `json:"owner_id"`
	Name      string    `json:"name"`
	ABN       string    `json:"abn,omitempty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type FleetVehicle struct {
	ID              uuid.UUID  `json:"id"`
	FleetID         uuid.UUID  `json:"fleet_id"`
	CurrentDriverID *uuid.UUID `json:"current_driver_id,omitempty"`
	Type            string     `json:"type"`
	Make            string     `json:"make"`
	Model           string     `json:"model"`
	Year            int        `json:"year"`
	Plate           string     `json:"plate"`
	VIN             string     `json:"vin,omitempty"`
	Capacity        float64    `json:"capacity"`
	RegoExpiry      time.Time  `json:"rego_expiry"`
	InsuranceExpiry time.Time  `json:"insurance_expiry"`
	Status          string     `json:"status"`
	Location        *Location  `json:"current_location,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Location struct {
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Address string  `json:"address,omitempty"`
}

type FleetDriver struct {
	ID       uuid.UUID `json:"id"`
	FleetID  uuid.UUID `json:"fleet_id"`
	DriverID uuid.UUID `json:"driver_id"`
	UserID   uuid.UUID `json:"user_id"`
	Status   string    `json:"status"`
	JoinedAt time.Time `json:"joined_at"`
}

type VehicleHandover struct {
	ID           uuid.UUID  `json:"id"`
	VehicleID    uuid.UUID  `json:"vehicle_id"`
	JobID        *uuid.UUID `json:"job_id,omitempty"`
	FromDriverID *uuid.UUID `json:"from_driver_id,omitempty"`
	ToDriverID   uuid.UUID  `json:"to_driver_id"`
	Status       string     `json:"status"`
	Location     *Location  `json:"location,omitempty"`
	Notes        string     `json:"notes,omitempty"`
	RequestedAt  time.Time  `json:"requested_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
}

// Request types
type CreateFleetRequest struct {
	Name string `json:"name" validate:"required,max=200"`
	ABN  string `json:"abn"`
}

type CreateVehicleRequest struct {
	Type            string  `json:"type" validate:"required"`
	Make            string  `json:"make" validate:"required"`
	Model           string  `json:"model" validate:"required"`
	Year            int     `json:"year" validate:"required,gte=1990"`
	Plate           string  `json:"plate" validate:"required"`
	VIN             string  `json:"vin"`
	Capacity        float64 `json:"capacity" validate:"required,gt=0"`
	RegoExpiry      string  `json:"rego_expiry" validate:"required"`
	InsuranceExpiry string  `json:"insurance_expiry" validate:"required"`
}

type AddDriverRequest struct {
	DriverID uuid.UUID `json:"driver_id" validate:"required"`
	UserID   uuid.UUID `json:"user_id" validate:"required"`
}

type HandoverRequest struct {
	VehicleID  uuid.UUID  `json:"vehicle_id" validate:"required"`
	ToDriverID uuid.UUID  `json:"to_driver_id" validate:"required"`
	JobID      *uuid.UUID `json:"job_id"`
	Notes      string     `json:"notes"`
}

type AssignVehicleRequest struct {
	DriverID uuid.UUID `json:"driver_id" validate:"required"`
}
