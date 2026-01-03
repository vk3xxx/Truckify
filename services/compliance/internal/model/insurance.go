package model

import (
	"time"
	"github.com/google/uuid"
)

type InsurancePolicy struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	VehicleID      *uuid.UUID `json:"vehicle_id,omitempty" db:"vehicle_id"`
	PolicyNumber   string     `json:"policy_number" db:"policy_number"`
	Provider       string     `json:"provider" db:"provider"`
	PolicyType     string     `json:"policy_type" db:"policy_type"`
	CoverageAmount float64    `json:"coverage_amount" db:"coverage_amount"`
	Premium        float64    `json:"premium" db:"premium"`
	StartDate      time.Time  `json:"start_date" db:"start_date"`
	EndDate        time.Time  `json:"end_date" db:"end_date"`
	Status         string     `json:"status" db:"status"`
	DocumentID     *uuid.UUID `json:"document_id,omitempty" db:"document_id"`
	VerifiedAt     *time.Time `json:"verified_at,omitempty" db:"verified_at"`
	VerifiedBy     *uuid.UUID `json:"verified_by,omitempty" db:"verified_by"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

type InsuranceClaim struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	PolicyID        uuid.UUID  `json:"policy_id" db:"policy_id"`
	JobID           *uuid.UUID `json:"job_id,omitempty" db:"job_id"`
	ClaimNumber     string     `json:"claim_number" db:"claim_number"`
	IncidentDate    time.Time  `json:"incident_date" db:"incident_date"`
	IncidentType    string     `json:"incident_type" db:"incident_type"`
	Description     string     `json:"description" db:"description"`
	ClaimAmount     float64    `json:"claim_amount" db:"claim_amount"`
	Status          string     `json:"status" db:"status"`
	Documents       []string   `json:"documents" db:"documents"`
	ResolutionNotes *string    `json:"resolution_notes,omitempty" db:"resolution_notes"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

type CreatePolicyRequest struct {
	VehicleID      *string `json:"vehicle_id"`
	PolicyNumber   string  `json:"policy_number" validate:"required"`
	Provider       string  `json:"provider" validate:"required"`
	PolicyType     string  `json:"policy_type" validate:"required,oneof=comprehensive third_party cargo liability freight goods_in_transit"`
	CoverageAmount float64 `json:"coverage_amount" validate:"required,gt=0"`
	Premium        float64 `json:"premium"`
	StartDate      string  `json:"start_date" validate:"required"`
	EndDate        string  `json:"end_date" validate:"required"`
	DocumentID     *string `json:"document_id"`
}

type CreateClaimRequest struct {
	PolicyID     string  `json:"policy_id" validate:"required"`
	JobID        *string `json:"job_id"`
	IncidentDate string  `json:"incident_date" validate:"required"`
	IncidentType string  `json:"incident_type" validate:"required,oneof=accident theft damage cargo_loss freight_damage delivery_failure"`
	Description  string  `json:"description" validate:"required"`
	ClaimAmount  float64 `json:"claim_amount" validate:"required,gt=0"`
}

type UpdateClaimStatusRequest struct {
	Status          string  `json:"status" validate:"required,oneof=under_review approved rejected paid"`
	ResolutionNotes *string `json:"resolution_notes"`
}
