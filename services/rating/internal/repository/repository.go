package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"truckify/services/rating/internal/model"
)

var (
	ErrRatingNotFound      = errors.New("rating not found")
	ErrRatingAlreadyExists = errors.New("rating already exists for this job")
)

// Repository handles rating data operations
type Repository struct {
	db *sql.DB
}

// New creates a new repository instance
func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// CreateRating creates a new rating
func (r *Repository) CreateRating(ctx context.Context, rating *model.Rating) error {
	query := `
		INSERT INTO ratings (id, job_id, rater_id, ratee_id, rating, comment, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := r.db.ExecContext(ctx, query,
		rating.ID, rating.JobID, rating.RaterID, rating.RateeID,
		rating.Rating, rating.Comment, rating.CreatedAt)

	if err != nil {
		if isUniqueViolation(err) {
			return ErrRatingAlreadyExists
		}
		return err
	}

	return nil
}

// GetRatingsByUser gets all ratings for a specific user
func (r *Repository) GetRatingsByUser(ctx context.Context, userID uuid.UUID) ([]model.Rating, error) {
	query := `
		SELECT id, job_id, rater_id, ratee_id, rating, comment, created_at
		FROM ratings
		WHERE ratee_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ratings []model.Rating
	for rows.Next() {
		var rating model.Rating
		err := rows.Scan(
			&rating.ID, &rating.JobID, &rating.RaterID, &rating.RateeID,
			&rating.Rating, &rating.Comment, &rating.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		ratings = append(ratings, rating)
	}

	return ratings, rows.Err()
}

// GetRatingsByJob gets all ratings for a specific job
func (r *Repository) GetRatingsByJob(ctx context.Context, jobID uuid.UUID) ([]model.Rating, error) {
	query := `
		SELECT id, job_id, rater_id, ratee_id, rating, comment, created_at
		FROM ratings
		WHERE job_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ratings []model.Rating
	for rows.Next() {
		var rating model.Rating
		err := rows.Scan(
			&rating.ID, &rating.JobID, &rating.RaterID, &rating.RateeID,
			&rating.Rating, &rating.Comment, &rating.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		ratings = append(ratings, rating)
	}

	return ratings, rows.Err()
}

// GetUserRatingStats gets rating statistics for a user
func (r *Repository) GetUserRatingStats(ctx context.Context, userID uuid.UUID) (*model.UserRatingStats, error) {
	query := `
		SELECT 
			COALESCE(AVG(rating), 0) as average_rating,
			COUNT(*) as total_ratings
		FROM ratings
		WHERE ratee_id = $1`

	var stats model.UserRatingStats
	stats.UserID = userID

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&stats.AverageRating, &stats.TotalRatings,
	)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// CheckRatingExists checks if a rating already exists for a job and rater
func (r *Repository) CheckRatingExists(ctx context.Context, jobID, raterID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM ratings WHERE job_id = $1 AND rater_id = $2)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, jobID, raterID).Scan(&exists)
	return exists, err
}

// isUniqueViolation checks if the error is a unique constraint violation
func isUniqueViolation(err error) bool {
	return err != nil && (err.Error() == "UNIQUE constraint failed" || 
		err.Error() == "duplicate key value violates unique constraint")
}