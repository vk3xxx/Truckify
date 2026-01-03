package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"truckify/services/backhaul/internal/model"
)

type Repository struct{ db *sqlx.DB }

func New(db *sqlx.DB) *Repository { return &Repository{db: db} }

func (r *Repository) CreateOpportunity(ctx context.Context, opp *model.BackhaulOpportunity) error {
	query := `INSERT INTO backhaul_opportunities (id, job_id, origin_city, origin_state, origin_lat, origin_lng, dest_city, dest_state, dest_lat, dest_lng, vehicle_type, pickup_date, price, status, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`
	_, err := r.db.ExecContext(ctx, query, opp.ID, opp.JobID, opp.OriginCity, opp.OriginState, opp.OriginLat, opp.OriginLng, opp.DestCity, opp.DestState, opp.DestLat, opp.DestLng, opp.VehicleType, opp.PickupDate, opp.Price, opp.Status, opp.CreatedAt)
	return err
}

func (r *Repository) FindAvailable(ctx context.Context, vehicleType string, after time.Time) ([]model.BackhaulOpportunity, error) {
	var opps []model.BackhaulOpportunity
	query := `SELECT * FROM backhaul_opportunities WHERE status = 'available' AND vehicle_type = $1 AND pickup_date >= $2 ORDER BY pickup_date`
	err := r.db.SelectContext(ctx, &opps, query, vehicleType, after)
	return opps, err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (*model.BackhaulOpportunity, error) {
	var opp model.BackhaulOpportunity
	err := r.db.GetContext(ctx, &opp, "SELECT * FROM backhaul_opportunities WHERE id = $1", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &opp, err
}

func (r *Repository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE backhaul_opportunities SET status = $1 WHERE id = $2", status, id)
	return err
}
