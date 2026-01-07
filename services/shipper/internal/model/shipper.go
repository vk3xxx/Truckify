package model

import (
	"time"

	"github.com/google/uuid"
)

type ShipperProfile struct {
	ID              uuid.UUID `json:"id" db:"id"`
	UserID          uuid.UUID `json:"user_id" db:"user_id"`
	CompanyName     string    `json:"company_name" db:"company_name"`
	ABN             *string   `json:"abn,omitempty" db:"abn"`
	TaxID           *string   `json:"tax_id,omitempty" db:"tax_id"`
	ContactName     string    `json:"contact_name" db:"contact_name"`
	ContactEmail    string    `json:"contact_email" db:"contact_email"`
	ContactPhone    string    `json:"contact_phone" db:"contact_phone"`
	BusinessAddress *Address  `json:"business_address,omitempty" db:"business_address"`
	Status          string    `json:"status" db:"status"` // pending, verified, suspended
	CreditLimit     *float64  `json:"credit_limit,omitempty" db:"credit_limit"`
	PaymentTerms    *int      `json:"payment_terms,omitempty" db:"payment_terms"` // days
	Rating          float64   `json:"rating" db:"rating"`
	TotalJobs       int       `json:"total_jobs" db:"total_jobs"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

type Address struct {
	Street     string  `json:"street"`
	City       string  `json:"city"`
	State      string  `json:"state"`
	PostalCode string  `json:"postal_code"`
	Country    string  `json:"country"`
	Lat        float64 `json:"lat,omitempty"`
	Lng        float64 `json:"lng,omitempty"`
}

type CreateShipperRequest struct {
	CompanyName     string   `json:"company_name" validate:"required,min=2,max=200"`
	ABN             *string  `json:"abn" validate:"omitempty,len=11"`
	TaxID           *string  `json:"tax_id" validate:"omitempty,min=5,max=50"`
	ContactName     string   `json:"contact_name" validate:"required,min=2,max=100"`
	ContactEmail    string   `json:"contact_email" validate:"required,email"`
	ContactPhone    string   `json:"contact_phone" validate:"required,e164"`
	BusinessAddress *Address `json:"business_address"`
}

type UpdateShipperRequest struct {
	CompanyName     *string  `json:"company_name" validate:"omitempty,min=2,max=200"`
	ABN             *string  `json:"abn" validate:"omitempty,len=11"`
	TaxID           *string  `json:"tax_id" validate:"omitempty,min=5,max=50"`
	ContactName     *string  `json:"contact_name" validate:"omitempty,min=2,max=100"`
	ContactEmail    *string  `json:"contact_email" validate:"omitempty,email"`
	ContactPhone    *string  `json:"contact_phone" validate:"omitempty,e164"`
	BusinessAddress *Address `json:"business_address"`
	CreditLimit     *float64 `json:"credit_limit" validate:"omitempty,gte=0"`
	PaymentTerms    *int     `json:"payment_terms" validate:"omitempty,gte=0,lte=365"`
}

type UpdateStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=pending verified suspended"`
}
