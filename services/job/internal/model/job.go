package model

import (
	"time"

	"github.com/google/uuid"
)

type Job struct {
	ID           uuid.UUID  `json:"id"`
	ShipperID    uuid.UUID  `json:"shipper_id"`
	DriverID     *uuid.UUID `json:"driver_id,omitempty"`
	Status       string     `json:"status"` // pending, assigned, in_transit, delivered, cancelled
	Pickup       Location   `json:"pickup"`
	Delivery     Location   `json:"delivery"`
	PickupDate   time.Time  `json:"pickup_date"`
	DeliveryDate time.Time  `json:"delivery_date"`
	CargoType    string     `json:"cargo_type"`
	Weight       float64    `json:"weight"`
	VehicleType  string     `json:"vehicle_type"`
	Price        float64    `json:"price"`
	Distance     float64    `json:"distance"`
	Notes        string     `json:"notes,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Location struct {
	City    string  `json:"city"`
	State   string  `json:"state"`
	Address string  `json:"address,omitempty"`
	Lat     float64 `json:"lat,omitempty"`
	Lng     float64 `json:"lng,omitempty"`
}

type CreateJobRequest struct {
	PickupCity     string  `json:"pickup_city" validate:"required"`
	PickupState    string  `json:"pickup_state" validate:"required"`
	PickupAddress  string  `json:"pickup_address"`
	DeliveryCity   string  `json:"delivery_city" validate:"required"`
	DeliveryState  string  `json:"delivery_state" validate:"required"`
	DeliveryAddr   string  `json:"delivery_address"`
	PickupDate     string  `json:"pickup_date" validate:"required"`
	DeliveryDate   string  `json:"delivery_date" validate:"required"`
	CargoType      string  `json:"cargo_type" validate:"required"`
	Weight         float64 `json:"weight" validate:"required,gt=0"`
	VehicleType    string  `json:"vehicle_type" validate:"required,oneof=flatbed dry_van refrigerated tanker"`
	Price          float64 `json:"price" validate:"required,gt=0"`
	Distance       float64 `json:"distance"`
	Notes          string  `json:"notes"`
}

type UpdateJobRequest struct {
	Status       *string  `json:"status" validate:"omitempty,oneof=pending assigned in_transit delivered cancelled"`
	PickupDate   *string  `json:"pickup_date"`
	DeliveryDate *string  `json:"delivery_date"`
	Price        *float64 `json:"price"`
	Notes        *string  `json:"notes"`
}

type AssignDriverRequest struct {
	DriverID string `json:"driver_id" validate:"required,uuid"`
}

type JobFilter struct {
	Status      string
	VehicleType string
	ShipperID   uuid.UUID
	DriverID    uuid.UUID
	Limit       int
	Offset      int
}
