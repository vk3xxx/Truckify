package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"truckify/services/payment/internal/model"
)

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Create(ctx context.Context, p *model.Payment) error {
	query := `INSERT INTO payments (id, job_id, payer_id, payee_id, amount, platform_fee, driver_payout, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`
	_, err := r.db.ExecContext(ctx, query, p.ID, p.JobID, p.PayerID, p.PayeeID, p.Amount, p.PlatformFee, p.DriverPayout, p.Status, p.CreatedAt, p.UpdatedAt)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*model.Payment, error) {
	var p model.Payment
	err := r.db.GetContext(ctx, &p, "SELECT * FROM payments WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status model.PaymentStatus) error {
	_, err := r.db.ExecContext(ctx, "UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3", status, time.Now(), id)
	return err
}

func (r *Repository) GetByJobID(ctx context.Context, jobID uuid.UUID) (*model.Payment, error) {
	var p model.Payment
	err := r.db.GetContext(ctx, &p, "SELECT * FROM payments WHERE job_id = $1", jobID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

// Subscription Tiers
func (r *Repository) GetSubscriptionTiers(ctx context.Context) ([]model.SubscriptionTier, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, monthly_price, annual_price, base_commission_rate, description, features, is_active 
		FROM subscription_tiers WHERE is_active = true ORDER BY monthly_price`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tiers []model.SubscriptionTier
	for rows.Next() {
		var t model.SubscriptionTier
		var featuresJSON string
		if err := rows.Scan(&t.ID, &t.Name, &t.MonthlyPrice, &t.AnnualPrice, &t.BaseCommissionRate, &t.Description, &featuresJSON, &t.IsActive); err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(featuresJSON), &t.Features)
		tiers = append(tiers, t)
	}
	return tiers, nil
}

func (r *Repository) GetSubscriptionTier(ctx context.Context, id uuid.UUID) (*model.SubscriptionTier, error) {
	var t model.SubscriptionTier
	var featuresJSON string
	err := r.db.QueryRowContext(ctx, `SELECT id, name, monthly_price, annual_price, base_commission_rate, description, features, is_active 
		FROM subscription_tiers WHERE id = $1`, id).Scan(&t.ID, &t.Name, &t.MonthlyPrice, &t.AnnualPrice, &t.BaseCommissionRate, &t.Description, &featuresJSON, &t.IsActive)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	json.Unmarshal([]byte(featuresJSON), &t.Features)
	return &t, err
}

// User Subscriptions
func (r *Repository) GetUserSubscription(ctx context.Context, userID uuid.UUID) (*model.Subscription, error) {
	var s model.Subscription
	err := r.db.QueryRowContext(ctx, `SELECT s.id, s.user_id, s.tier_id, t.name, s.status, s.started_at, s.expires_at, s.auto_renew 
		FROM subscriptions s JOIN subscription_tiers t ON s.tier_id = t.id 
		WHERE s.user_id = $1 AND s.status = 'active' ORDER BY s.started_at DESC LIMIT 1`, userID).
		Scan(&s.ID, &s.UserID, &s.TierID, &s.TierName, &s.Status, &s.StartedAt, &s.ExpiresAt, &s.AutoRenew)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &s, err
}

func (r *Repository) CreateSubscription(ctx context.Context, s *model.Subscription) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO subscriptions (id, user_id, tier_id, stripe_subscription_id, status, started_at, expires_at, auto_renew, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, s.ID, s.UserID, s.TierID, s.StripeSubscriptionID, s.Status, s.StartedAt, s.ExpiresAt, s.AutoRenew, time.Now())
	return err
}

func (r *Repository) CancelSubscription(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `UPDATE subscriptions SET status = 'cancelled', auto_renew = false WHERE user_id = $1 AND status = 'active'`, userID)
	return err
}

func (r *Repository) CancelSubscriptionByStripeID(ctx context.Context, stripeSubID string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE subscriptions SET status = 'cancelled', auto_renew = false WHERE stripe_subscription_id = $1`, stripeSubID)
	return err
}

func (r *Repository) GetSubscriptionByStripeID(ctx context.Context, stripeSubID string) (*model.Subscription, error) {
	var s model.Subscription
	err := r.db.QueryRowContext(ctx, `SELECT id, user_id, tier_id, stripe_subscription_id, status, started_at, expires_at, auto_renew 
		FROM subscriptions WHERE stripe_subscription_id = $1`, stripeSubID).
		Scan(&s.ID, &s.UserID, &s.TierID, &s.StripeSubscriptionID, &s.Status, &s.StartedAt, &s.ExpiresAt, &s.AutoRenew)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &s, err
}

// Commission Tiers
func (r *Repository) GetCommissionTiers(ctx context.Context) ([]model.CommissionTier, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, min_job_value, max_job_value, rate_discount FROM commission_tiers ORDER BY min_job_value`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tiers []model.CommissionTier
	for rows.Next() {
		var t model.CommissionTier
		if err := rows.Scan(&t.ID, &t.MinJobValue, &t.MaxJobValue, &t.RateDiscount); err != nil {
			return nil, err
		}
		tiers = append(tiers, t)
	}
	return tiers, nil
}

// Platform Settings
func (r *Repository) GetSetting(ctx context.Context, key string) (string, error) {
	var value string
	err := r.db.QueryRowContext(ctx, `SELECT value FROM platform_settings WHERE key = $1`, key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (r *Repository) SetSetting(ctx context.Context, key, value string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO platform_settings (key, value, updated_at) VALUES ($1, $2, $3)
		ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = $3`, key, value, time.Now())
	return err
}
