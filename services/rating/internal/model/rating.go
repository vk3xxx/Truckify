package model

import (
	"time"

	"github.com/google/uuid"
)

// Rating represents a rating in the system
type Rating struct {
	ID        uuid.UUID `db:"id" json:"id"`
	JobID     uuid.UUID `db:"job_id" json:"job_id"`
	RaterID   uuid.UUID `db:"rater_id" json:"rater_id"`
	RateeID   uuid.UUID `db:"ratee_id" json:"ratee_id"`
	Rating    int       `db:"rating" json:"rating"`
	Comment   string    `db:"comment" json:"comment"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// CreateRatingRequest represents a request to create a rating
type CreateRatingRequest struct {
	JobID   uuid.UUID `json:"job_id" validate:"required"`
	RateeID uuid.UUID `json:"ratee_id" validate:"required"`
	Rating  int       `json:"rating" validate:"required,min=1,max=5"`
	Comment string    `json:"comment" validate:"max=500"`
}

// RatingResponse represents a rating in API responses
type RatingResponse struct {
	ID        uuid.UUID `json:"id"`
	JobID     uuid.UUID `json:"job_id"`
	RaterID   uuid.UUID `json:"rater_id"`
	RateeID   uuid.UUID `json:"ratee_id"`
	Rating    int       `json:"rating"`
	Comment   string    `json:"comment"`
	CreatedAt time.Time `json:"created_at"`
}

// UserRatingStats represents rating statistics for a user
type UserRatingStats struct {
	UserID       uuid.UUID `json:"user_id"`
	AverageRating float64   `json:"average_rating"`
	TotalRatings int       `json:"total_ratings"`
}

// ToRatingResponse converts Rating to RatingResponse
func (r *Rating) ToRatingResponse() *RatingResponse {
	return &RatingResponse{
		ID:        r.ID,
		JobID:     r.JobID,
		RaterID:   r.RaterID,
		RateeID:   r.RateeID,
		Rating:    r.Rating,
		Comment:   r.Comment,
		CreatedAt: r.CreatedAt,
	}
}