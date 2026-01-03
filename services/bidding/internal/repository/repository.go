package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"truckify/services/bidding/internal/model"
)

type Repository struct {
	db *sqlx.DB
}

func New(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, bid *model.Bid) error {
	query := `INSERT INTO bids (id, job_id, driver_id, amount, notes, status, expires_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	_, err := r.db.ExecContext(ctx, query, bid.ID, bid.JobID, bid.DriverID, bid.Amount, bid.Notes, bid.Status, bid.ExpiresAt, bid.CreatedAt, bid.UpdatedAt)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*model.Bid, error) {
	var bid model.Bid
	err := r.db.GetContext(ctx, &bid, "SELECT * FROM bids WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &bid, err
}

func (r *Repository) GetByJobID(ctx context.Context, jobID uuid.UUID) ([]model.Bid, error) {
	var bids []model.Bid
	err := r.db.SelectContext(ctx, &bids, "SELECT * FROM bids WHERE job_id = $1 ORDER BY amount ASC", jobID)
	return bids, err
}

func (r *Repository) GetByDriverID(ctx context.Context, driverID uuid.UUID) ([]model.Bid, error) {
	var bids []model.Bid
	err := r.db.SelectContext(ctx, &bids, "SELECT * FROM bids WHERE driver_id = $1 ORDER BY created_at DESC", driverID)
	return bids, err
}

func (r *Repository) GetByJobAndDriver(ctx context.Context, jobID, driverID uuid.UUID) (*model.Bid, error) {
	var bid model.Bid
	err := r.db.GetContext(ctx, &bid, "SELECT * FROM bids WHERE job_id = $1 AND driver_id = $2", jobID, driverID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &bid, err
}

func (r *Repository) Update(ctx context.Context, bid *model.Bid) error {
	query := `UPDATE bids SET amount = $1, notes = $2, status = $3, updated_at = $4 WHERE id = $5`
	_, err := r.db.ExecContext(ctx, query, bid.Amount, bid.Notes, bid.Status, bid.UpdatedAt, bid.ID)
	return err
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status model.BidStatus) error {
	_, err := r.db.ExecContext(ctx, "UPDATE bids SET status = $1, updated_at = NOW() WHERE id = $2", status, id)
	return err
}

func (r *Repository) RejectOtherBids(ctx context.Context, jobID, acceptedBidID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "UPDATE bids SET status = $1, updated_at = NOW() WHERE job_id = $2 AND id != $3 AND status = $4",
		model.BidStatusRejected, jobID, acceptedBidID, model.BidStatusPending)
	return err
}

func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM bids WHERE id = $1", id)
	return err
}
