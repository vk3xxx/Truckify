package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/rating/internal/model"
	"truckify/services/rating/internal/repository"
	"truckify/shared/pkg/logger"
)

var (
	ErrRatingNotFound      = repository.ErrRatingNotFound
	ErrRatingAlreadyExists = repository.ErrRatingAlreadyExists
	ErrInvalidRating       = errors.New("rating must be between 1 and 5")
	ErrCannotRateSelf      = errors.New("cannot rate yourself")
)

// RepositoryInterface defines the interface for rating repository operations
type RepositoryInterface interface {
	CreateRating(ctx context.Context, rating *model.Rating) error
	GetRatingsByUser(ctx context.Context, userID uuid.UUID) ([]model.Rating, error)
	GetRatingsByJob(ctx context.Context, jobID uuid.UUID) ([]model.Rating, error)
	GetUserRatingStats(ctx context.Context, userID uuid.UUID) (*model.UserRatingStats, error)
	CheckRatingExists(ctx context.Context, jobID, raterID uuid.UUID) (bool, error)
}

// Service handles rating business logic
type Service struct {
	repo   RepositoryInterface
	logger *logger.Logger
}

// New creates a new service instance
func New(repo RepositoryInterface, logger *logger.Logger) *Service {
	return &Service{
		repo:   repo,
		logger: logger,
	}
}

// CreateRating creates a new rating
func (s *Service) CreateRating(ctx context.Context, raterID uuid.UUID, req *model.CreateRatingRequest) (*model.RatingResponse, error) {
	// Validate rating value
	if req.Rating < 1 || req.Rating > 5 {
		return nil, ErrInvalidRating
	}

	// Check if user is trying to rate themselves
	if raterID == req.RateeID {
		return nil, ErrCannotRateSelf
	}

	// Check if rating already exists
	exists, err := s.repo.CheckRatingExists(ctx, req.JobID, raterID)
	if err != nil {
		s.logger.Error("Failed to check rating existence", "error", err)
		return nil, err
	}
	if exists {
		return nil, ErrRatingAlreadyExists
	}

	// Create rating
	rating := &model.Rating{
		ID:        uuid.New(),
		JobID:     req.JobID,
		RaterID:   raterID,
		RateeID:   req.RateeID,
		Rating:    req.Rating,
		Comment:   req.Comment,
		CreatedAt: time.Now(),
	}

	if err := s.repo.CreateRating(ctx, rating); err != nil {
		s.logger.Error("Failed to create rating", "error", err)
		return nil, err
	}

	s.logger.Info("Rating created successfully", "rating_id", rating.ID, "rater_id", raterID)
	return rating.ToRatingResponse(), nil
}

// GetRatingsByUser gets all ratings for a specific user
func (s *Service) GetRatingsByUser(ctx context.Context, userID uuid.UUID) ([]model.RatingResponse, error) {
	ratings, err := s.repo.GetRatingsByUser(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get ratings by user", "error", err, "user_id", userID)
		return nil, err
	}

	responses := make([]model.RatingResponse, len(ratings))
	for i, rating := range ratings {
		responses[i] = *rating.ToRatingResponse()
	}

	return responses, nil
}

// GetRatingsByJob gets all ratings for a specific job
func (s *Service) GetRatingsByJob(ctx context.Context, jobID uuid.UUID) ([]model.RatingResponse, error) {
	ratings, err := s.repo.GetRatingsByJob(ctx, jobID)
	if err != nil {
		s.logger.Error("Failed to get ratings by job", "error", err, "job_id", jobID)
		return nil, err
	}

	responses := make([]model.RatingResponse, len(ratings))
	for i, rating := range ratings {
		responses[i] = *rating.ToRatingResponse()
	}

	return responses, nil
}

// GetUserRatingStats gets rating statistics for a user
func (s *Service) GetUserRatingStats(ctx context.Context, userID uuid.UUID) (*model.UserRatingStats, error) {
	stats, err := s.repo.GetUserRatingStats(ctx, userID)
	if err != nil {
		s.logger.Error("Failed to get user rating stats", "error", err, "user_id", userID)
		return nil, err
	}

	return stats, nil
}