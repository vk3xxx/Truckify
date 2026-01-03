package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"truckify/services/compliance/internal/model"
	"truckify/services/compliance/internal/repository"
)

type Service struct{ repo *repository.Repository }

func New(repo *repository.Repository) *Service { return &Service{repo: repo} }

func (s *Service) CreatePolicy(ctx context.Context, userID uuid.UUID, req *model.CreatePolicyRequest) (*model.InsurancePolicy, error) {
	startDate, _ := time.Parse("2006-01-02", req.StartDate)
	endDate, _ := time.Parse("2006-01-02", req.EndDate)

	var vehicleID *uuid.UUID
	if req.VehicleID != nil {
		id, _ := uuid.Parse(*req.VehicleID)
		vehicleID = &id
	}
	var docID *uuid.UUID
	if req.DocumentID != nil {
		id, _ := uuid.Parse(*req.DocumentID)
		docID = &id
	}

	status := "pending"
	if startDate.Before(time.Now()) && endDate.After(time.Now()) {
		status = "active"
	}

	p := &model.InsurancePolicy{
		ID:             uuid.New(),
		UserID:         userID,
		VehicleID:      vehicleID,
		PolicyNumber:   req.PolicyNumber,
		Provider:       req.Provider,
		PolicyType:     req.PolicyType,
		CoverageAmount: req.CoverageAmount,
		Premium:        req.Premium,
		StartDate:      startDate,
		EndDate:        endDate,
		Status:         status,
		DocumentID:     docID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := s.repo.CreatePolicy(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *Service) GetPolicy(ctx context.Context, id uuid.UUID) (*model.InsurancePolicy, error) {
	return s.repo.GetPolicy(ctx, id)
}

func (s *Service) GetUserPolicies(ctx context.Context, userID uuid.UUID) ([]model.InsurancePolicy, error) {
	return s.repo.GetUserPolicies(ctx, userID)
}

func (s *Service) GetExpiringPolicies(ctx context.Context, days int) ([]model.InsurancePolicy, error) {
	return s.repo.GetExpiringPolicies(ctx, days)
}

func (s *Service) VerifyPolicy(ctx context.Context, id, verifiedBy uuid.UUID, approve bool) error {
	status := "active"
	if !approve {
		status = "cancelled"
	}
	return s.repo.VerifyPolicy(ctx, id, verifiedBy, status)
}

func (s *Service) CreateClaim(ctx context.Context, userID uuid.UUID, req *model.CreateClaimRequest) (*model.InsuranceClaim, error) {
	policyID, _ := uuid.Parse(req.PolicyID)
	
	// Verify policy belongs to user and is active
	policy, err := s.repo.GetPolicy(ctx, policyID)
	if err != nil || policy == nil {
		return nil, fmt.Errorf("policy not found")
	}
	if policy.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}
	if policy.Status != "active" {
		return nil, fmt.Errorf("policy not active")
	}

	incidentDate, _ := time.Parse("2006-01-02", req.IncidentDate)
	var jobID *uuid.UUID
	if req.JobID != nil {
		id, _ := uuid.Parse(*req.JobID)
		jobID = &id
	}

	c := &model.InsuranceClaim{
		ID:           uuid.New(),
		PolicyID:     policyID,
		JobID:        jobID,
		ClaimNumber:  fmt.Sprintf("CLM-%d", time.Now().UnixNano()%1000000),
		IncidentDate: incidentDate,
		IncidentType: req.IncidentType,
		Description:  req.Description,
		ClaimAmount:  req.ClaimAmount,
		Status:       "submitted",
		Documents:    []string{},
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.CreateClaim(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Service) GetClaim(ctx context.Context, id uuid.UUID) (*model.InsuranceClaim, error) {
	return s.repo.GetClaim(ctx, id)
}

func (s *Service) GetUserClaims(ctx context.Context, userID uuid.UUID) ([]model.InsuranceClaim, error) {
	return s.repo.GetUserClaims(ctx, userID)
}

func (s *Service) GetPolicyClaims(ctx context.Context, policyID uuid.UUID) ([]model.InsuranceClaim, error) {
	return s.repo.GetPolicyClaims(ctx, policyID)
}

func (s *Service) UpdateClaimStatus(ctx context.Context, id uuid.UUID, req *model.UpdateClaimStatusRequest) error {
	return s.repo.UpdateClaimStatus(ctx, id, req.Status, req.ResolutionNotes)
}

func (s *Service) AddClaimDocument(ctx context.Context, claimID uuid.UUID, docID string) error {
	return s.repo.AddClaimDocument(ctx, claimID, docID)
}

// CheckExpiredPolicies updates status of expired policies
func (s *Service) CheckExpiredPolicies(ctx context.Context) error {
	policies, err := s.repo.GetExpiringPolicies(ctx, 0)
	if err != nil {
		return err
	}
	for _, p := range policies {
		if p.EndDate.Before(time.Now()) {
			s.repo.UpdatePolicyStatus(ctx, p.ID, "expired")
		}
	}
	return nil
}
