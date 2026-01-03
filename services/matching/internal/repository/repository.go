package repository

import (
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/matching/internal/model"
)

var ErrNotFound = errors.New("match not found")

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateMatch(jobID, driverID uuid.UUID, score, distance float64) (*model.Match, error) {
	match := &model.Match{
		ID:        uuid.New(),
		JobID:     jobID,
		DriverID:  driverID,
		Score:     score,
		Distance:  distance,
		Status:    "pending",
		ExpiresAt: time.Now().Add(30 * time.Minute),
		CreatedAt: time.Now(),
	}

	_, err := r.db.Exec(`
		INSERT INTO matches (id, job_id, driver_id, score, distance_km, status, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		match.ID, match.JobID, match.DriverID, match.Score, match.Distance, match.Status, match.ExpiresAt, match.CreatedAt)
	if err != nil {
		return nil, err
	}
	return match, nil
}

func (r *Repository) GetByID(id uuid.UUID) (*model.Match, error) {
	match := &model.Match{}
	err := r.db.QueryRow(`
		SELECT id, job_id, driver_id, score, distance_km, status, expires_at, created_at
		FROM matches WHERE id = $1`, id).Scan(
		&match.ID, &match.JobID, &match.DriverID, &match.Score, &match.Distance, &match.Status, &match.ExpiresAt, &match.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return match, err
}

func (r *Repository) GetByJobID(jobID uuid.UUID) ([]*model.Match, error) {
	rows, err := r.db.Query(`
		SELECT id, job_id, driver_id, score, distance_km, status, expires_at, created_at
		FROM matches WHERE job_id = $1 ORDER BY score DESC`, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var matches []*model.Match
	for rows.Next() {
		m := &model.Match{}
		rows.Scan(&m.ID, &m.JobID, &m.DriverID, &m.Score, &m.Distance, &m.Status, &m.ExpiresAt, &m.CreatedAt)
		matches = append(matches, m)
	}
	return matches, nil
}

func (r *Repository) GetPendingForDriver(driverID uuid.UUID) ([]*model.Match, error) {
	rows, err := r.db.Query(`
		SELECT id, job_id, driver_id, score, distance_km, status, expires_at, created_at
		FROM matches WHERE driver_id = $1 AND status = 'pending' AND expires_at > NOW()
		ORDER BY score DESC`, driverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var matches []*model.Match
	for rows.Next() {
		m := &model.Match{}
		rows.Scan(&m.ID, &m.JobID, &m.DriverID, &m.Score, &m.Distance, &m.Status, &m.ExpiresAt, &m.CreatedAt)
		matches = append(matches, m)
	}
	return matches, nil
}

func (r *Repository) UpdateStatus(id uuid.UUID, status string) error {
	result, err := r.db.Exec(`UPDATE matches SET status = $1 WHERE id = $2`, status, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) ExpireOldMatches() (int64, error) {
	result, err := r.db.Exec(`UPDATE matches SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW()`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
