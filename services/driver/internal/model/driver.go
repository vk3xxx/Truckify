package model

import (
	"time"

	"github.com/google/uuid"
)

type DriverProfile struct {
	ID              uuid.UUID        `json:"id"`
	UserID          uuid.UUID        `json:"user_id"`
	LicenseNumber   string           `json:"license_number"`
	LicenseState    string           `json:"license_state"`
	LicenseExpiry   time.Time        `json:"license_expiry"`
	LicenseClass    string           `json:"license_class"`
	YearsExperience int              `json:"years_experience"`
	IsAvailable     bool             `json:"is_available"`
	CurrentLocation *Location        `json:"current_location,omitempty"`
	Vehicle         *Vehicle         `json:"vehicle,omitempty"`
	Rating          float64          `json:"rating"`
	TotalTrips      int              `json:"total_trips"`
	Status          string           `json:"status"` // pending, approved, suspended
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

type Location struct {
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Address string  `json:"address,omitempty"`
}

type Vehicle struct {
	ID           uuid.UUID `json:"id"`
	DriverID     uuid.UUID `json:"driver_id"`
	Type         string    `json:"type"` // flatbed, dry_van, refrigerated, tanker
	Make         string    `json:"make"`
	Model        string    `json:"model"`
	Year         int       `json:"year"`
	Plate        string    `json:"plate"`
	Capacity     float64   `json:"capacity"` // in kg
	RegoExpiry   time.Time `json:"rego_expiry"`
	InsuranceExp time.Time `json:"insurance_expiry"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateDriverRequest struct {
	LicenseNumber   string `json:"license_number" validate:"required"`
	LicenseState    string `json:"license_state" validate:"required"`
	LicenseExpiry   string `json:"license_expiry" validate:"required"`
	LicenseClass    string `json:"license_class" validate:"required"`
	YearsExperience int    `json:"years_experience" validate:"gte=0"`
}

type UpdateDriverRequest struct {
	LicenseNumber   *string `json:"license_number"`
	LicenseState    *string `json:"license_state"`
	LicenseExpiry   *string `json:"license_expiry"`
	LicenseClass    *string `json:"license_class"`
	YearsExperience *int    `json:"years_experience"`
	IsAvailable     *bool   `json:"is_available"`
}

type UpdateLocationRequest struct {
	Lat     float64 `json:"lat" validate:"required,latitude"`
	Lng     float64 `json:"lng" validate:"required,longitude"`
	Address string  `json:"address"`
}

type AddVehicleRequest struct {
	Type         string  `json:"type" validate:"required,oneof=flatbed dry_van refrigerated tanker"`
	Make         string  `json:"make" validate:"required"`
	Model        string  `json:"model" validate:"required"`
	Year         int     `json:"year" validate:"required,gte=1990"`
	Plate        string  `json:"plate" validate:"required"`
	Capacity     float64 `json:"capacity" validate:"required,gt=0"`
	RegoExpiry   string  `json:"rego_expiry" validate:"required"`
	InsuranceExp string  `json:"insurance_expiry" validate:"required"`
}
