package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"truckify/services/tracking/internal/model"
	"truckify/services/tracking/internal/repository"
	"truckify/shared/pkg/logger"
)

// RepositoryInterface defines the interface for tracking repository operations
type RepositoryInterface interface {
	CreateTrackingEvent(ctx context.Context, event *model.TrackingEvent) error
	GetJobTrackingHistory(ctx context.Context, jobID uuid.UUID) ([]model.TrackingEvent, error)
	GetDriverCurrentLocation(ctx context.Context, driverID uuid.UUID) (*model.TrackingEvent, error)
	GetRecentTrackingEvents(ctx context.Context, since time.Time) ([]model.TrackingEvent, error)
	GetStops(ctx context.Context, jobID uuid.UUID) ([]model.Stop, error)
}

// Service handles tracking business logic
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

// UpdateLocation updates driver location
func (s *Service) UpdateLocation(ctx context.Context, req *model.LocationUpdateRequest) error {
	event := &model.TrackingEvent{
		ID:        uuid.New(),
		JobID:     req.JobID,
		DriverID:  req.DriverID,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Speed:     req.Speed,
		Heading:   req.Heading,
		Timestamp: time.Now(),
		EventType: req.EventType,
		CreatedAt: time.Now(),
	}

	if err := s.repo.CreateTrackingEvent(ctx, event); err != nil {
		s.logger.Error("Failed to create tracking event", "error", err, "driver_id", req.DriverID)
		return err
	}

	s.logger.Info("Location updated", "driver_id", req.DriverID, "job_id", req.JobID)
	return nil
}

// GetJobTrackingHistory gets tracking history for a job
func (s *Service) GetJobTrackingHistory(ctx context.Context, jobID uuid.UUID) ([]model.TrackingEvent, error) {
	events, err := s.repo.GetJobTrackingHistory(ctx, jobID)
	if err != nil {
		s.logger.Error("Failed to get job tracking history", "error", err, "job_id", jobID)
		return nil, err
	}
	return events, nil
}

// GetDriverCurrentLocation gets current location of a driver
func (s *Service) GetDriverCurrentLocation(ctx context.Context, driverID uuid.UUID) (*model.CurrentLocationResponse, error) {
	event, err := s.repo.GetDriverCurrentLocation(ctx, driverID)
	if err != nil {
		if err == repository.ErrTrackingEventNotFound {
			return nil, err
		}
		s.logger.Error("Failed to get driver current location", "error", err, "driver_id", driverID)
		return nil, err
	}

	response := &model.CurrentLocationResponse{
		DriverID:  event.DriverID,
		Latitude:  event.Latitude,
		Longitude: event.Longitude,
		Speed:     event.Speed,
		Heading:   event.Heading,
		Timestamp: event.Timestamp,
		EventType: event.EventType,
	}

	return response, nil
}

// GetStops gets all detected stops for a job (5+ min stationary)
func (s *Service) GetStops(ctx context.Context, jobID uuid.UUID) ([]model.Stop, error) {
	return s.repo.GetStops(ctx, jobID)
}