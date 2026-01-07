package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"truckify/services/compliance/internal/model"
)

type Repository struct{ db *sql.DB }

func New(db *sql.DB) *Repository { return &Repository{db: db} }

// Policies
func (r *Repository) CreatePolicy(ctx context.Context, p *model.InsurancePolicy) error {
	query := `INSERT INTO insurance_policies (id, user_id, vehicle_id, policy_number, provider, policy_type, coverage_amount, premium, start_date, end_date, status, document_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`
	_, err := r.db.ExecContext(ctx, query, p.ID, p.UserID, p.VehicleID, p.PolicyNumber, p.Provider, p.PolicyType, p.CoverageAmount, p.Premium, p.StartDate, p.EndDate, p.Status, p.DocumentID, p.CreatedAt, p.UpdatedAt)
	return err
}

func (r *Repository) GetPolicy(ctx context.Context, id uuid.UUID) (*model.InsurancePolicy, error) {
	var p model.InsurancePolicy
	err := r.db.QueryRowContext(ctx, `SELECT id, user_id, vehicle_id, policy_number, provider, policy_type, coverage_amount, premium, start_date, end_date, status, document_id, verified_at, verified_by, created_at, updated_at FROM insurance_policies WHERE id = $1`, id).
		Scan(&p.ID, &p.UserID, &p.VehicleID, &p.PolicyNumber, &p.Provider, &p.PolicyType, &p.CoverageAmount, &p.Premium, &p.StartDate, &p.EndDate, &p.Status, &p.DocumentID, &p.VerifiedAt, &p.VerifiedBy, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func (r *Repository) GetUserPolicies(ctx context.Context, userID uuid.UUID) ([]model.InsurancePolicy, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, user_id, vehicle_id, policy_number, provider, policy_type, coverage_amount, premium, start_date, end_date, status, document_id, verified_at, verified_by, created_at, updated_at FROM insurance_policies WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var policies []model.InsurancePolicy
	for rows.Next() {
		var p model.InsurancePolicy
		if err := rows.Scan(&p.ID, &p.UserID, &p.VehicleID, &p.PolicyNumber, &p.Provider, &p.PolicyType, &p.CoverageAmount, &p.Premium, &p.StartDate, &p.EndDate, &p.Status, &p.DocumentID, &p.VerifiedAt, &p.VerifiedBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		policies = append(policies, p)
	}
	return policies, nil
}

func (r *Repository) GetExpiringPolicies(ctx context.Context, days int) ([]model.InsurancePolicy, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, user_id, vehicle_id, policy_number, provider, policy_type, coverage_amount, premium, start_date, end_date, status, document_id, verified_at, verified_by, created_at, updated_at FROM insurance_policies WHERE status = 'active' AND end_date <= NOW() + INTERVAL '1 day' * $1 ORDER BY end_date`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var policies []model.InsurancePolicy
	for rows.Next() {
		var p model.InsurancePolicy
		if err := rows.Scan(&p.ID, &p.UserID, &p.VehicleID, &p.PolicyNumber, &p.Provider, &p.PolicyType, &p.CoverageAmount, &p.Premium, &p.StartDate, &p.EndDate, &p.Status, &p.DocumentID, &p.VerifiedAt, &p.VerifiedBy, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		policies = append(policies, p)
	}
	return policies, nil
}

func (r *Repository) VerifyPolicy(ctx context.Context, id, verifiedBy uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE insurance_policies SET status = $1, verified_at = $2, verified_by = $3, updated_at = $4 WHERE id = $5`, status, time.Now(), verifiedBy, time.Now(), id)
	return err
}

func (r *Repository) UpdatePolicyStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE insurance_policies SET status = $1, updated_at = $2 WHERE id = $3`, status, time.Now(), id)
	return err
}

// Claims
func (r *Repository) CreateClaim(ctx context.Context, c *model.InsuranceClaim) error {
	docsJSON, _ := json.Marshal(c.Documents)
	query := `INSERT INTO insurance_claims (id, policy_id, job_id, claim_number, incident_date, incident_type, description, claim_amount, status, documents, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	_, err := r.db.ExecContext(ctx, query, c.ID, c.PolicyID, c.JobID, c.ClaimNumber, c.IncidentDate, c.IncidentType, c.Description, c.ClaimAmount, c.Status, docsJSON, c.CreatedAt, c.UpdatedAt)
	return err
}

func (r *Repository) GetClaim(ctx context.Context, id uuid.UUID) (*model.InsuranceClaim, error) {
	var c model.InsuranceClaim
	var docsJSON []byte
	err := r.db.QueryRowContext(ctx, `SELECT id, policy_id, job_id, claim_number, incident_date, incident_type, description, claim_amount, status, documents, resolution_notes, resolved_at, created_at, updated_at FROM insurance_claims WHERE id = $1`, id).
		Scan(&c.ID, &c.PolicyID, &c.JobID, &c.ClaimNumber, &c.IncidentDate, &c.IncidentType, &c.Description, &c.ClaimAmount, &c.Status, &docsJSON, &c.ResolutionNotes, &c.ResolvedAt, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	json.Unmarshal(docsJSON, &c.Documents)
	return &c, err
}

func (r *Repository) GetPolicyClaims(ctx context.Context, policyID uuid.UUID) ([]model.InsuranceClaim, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, policy_id, job_id, claim_number, incident_date, incident_type, description, claim_amount, status, documents, resolution_notes, resolved_at, created_at, updated_at FROM insurance_claims WHERE policy_id = $1 ORDER BY created_at DESC`, policyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var claims []model.InsuranceClaim
	for rows.Next() {
		var c model.InsuranceClaim
		var docsJSON []byte
		if err := rows.Scan(&c.ID, &c.PolicyID, &c.JobID, &c.ClaimNumber, &c.IncidentDate, &c.IncidentType, &c.Description, &c.ClaimAmount, &c.Status, &docsJSON, &c.ResolutionNotes, &c.ResolvedAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(docsJSON, &c.Documents)
		claims = append(claims, c)
	}
	return claims, nil
}

func (r *Repository) GetUserClaims(ctx context.Context, userID uuid.UUID) ([]model.InsuranceClaim, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT c.id, c.policy_id, c.job_id, c.claim_number, c.incident_date, c.incident_type, c.description, c.claim_amount, c.status, c.documents, c.resolution_notes, c.resolved_at, c.created_at, c.updated_at 
		FROM insurance_claims c JOIN insurance_policies p ON c.policy_id = p.id WHERE p.user_id = $1 ORDER BY c.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var claims []model.InsuranceClaim
	for rows.Next() {
		var c model.InsuranceClaim
		var docsJSON []byte
		if err := rows.Scan(&c.ID, &c.PolicyID, &c.JobID, &c.ClaimNumber, &c.IncidentDate, &c.IncidentType, &c.Description, &c.ClaimAmount, &c.Status, &docsJSON, &c.ResolutionNotes, &c.ResolvedAt, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		json.Unmarshal(docsJSON, &c.Documents)
		claims = append(claims, c)
	}
	return claims, nil
}

func (r *Repository) UpdateClaimStatus(ctx context.Context, id uuid.UUID, status string, notes *string) error {
	var resolvedAt interface{}
	if status == "approved" || status == "rejected" || status == "paid" {
		t := time.Now()
		resolvedAt = &t
	}
	_, err := r.db.ExecContext(ctx, `UPDATE insurance_claims SET status = $1, resolution_notes = $2, resolved_at = $3, updated_at = $4 WHERE id = $5`, status, notes, resolvedAt, time.Now(), id)
	return err
}

func (r *Repository) AddClaimDocument(ctx context.Context, claimID uuid.UUID, docID string) error {
	// Properly marshal docID to prevent SQL injection
	docJSON, err := json.Marshal([]string{docID})
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `UPDATE insurance_claims SET documents = documents || $1::jsonb, updated_at = $2 WHERE id = $3`, string(docJSON), time.Now(), claimID)
	return err
}
