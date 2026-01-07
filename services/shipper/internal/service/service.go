package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"truckify/services/shipper/internal/model"
	"truckify/shared/pkg/logger"
)

type RepositoryInterface interface {
	CreateShipper(ctx context.Context, shipper *model.ShipperProfile) error
	GetShipperByUserID(ctx context.Context, userID uuid.UUID) (*model.ShipperProfile, error)
	GetShipperByID(ctx context.Context, id uuid.UUID) (*model.ShipperProfile, error)
	UpdateShipper(ctx context.Context, userID uuid.UUID, req *model.UpdateShipperRequest) (*model.ShipperProfile, error)
	UpdateStatus(ctx context.Context, userID uuid.UUID, status string) error
	DeleteShipper(ctx context.Context, userID uuid.UUID) error
	ListShippers(ctx context.Context, status string, limit, offset int) ([]model.ShipperProfile, error)
}

type Service struct {
	repo   RepositoryInterface
	logger *logger.Logger
}

func New(repo RepositoryInterface, logger *logger.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

func (s *Service) CreateShipper(ctx context.Context, userID uuid.UUID, req *model.CreateShipperRequest) (*model.ShipperProfile, error) {
	shipper := &model.ShipperProfile{
		ID:              uuid.New(),
		UserID:          userID,
		CompanyName:     req.CompanyName,
		ABN:             req.ABN,
		TaxID:           req.TaxID,
		ContactName:     req.ContactName,
		ContactEmail:    req.ContactEmail,
		ContactPhone:    req.ContactPhone,
		BusinessAddress: req.BusinessAddress,
		Status:          "pending",
		Rating:          0.0,
		TotalJobs:       0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := s.repo.CreateShipper(ctx, shipper); err != nil {
		s.logger.Error("Failed to create shipper", "error", err, "user_id", userID)
		return nil, err
	}

	s.logger.Info("Shipper created", "shipper_id", shipper.ID, "user_id", userID)
	return shipper, nil
}

func (s *Service) GetShipper(ctx context.Context, userID uuid.UUID) (*model.ShipperProfile, error) {
	return s.repo.GetShipperByUserID(ctx, userID)
}

func (s *Service) GetShipperByID(ctx context.Context, id uuid.UUID) (*model.ShipperProfile, error) {
	return s.repo.GetShipperByID(ctx, id)
}

func (s *Service) UpdateShipper(ctx context.Context, userID uuid.UUID, req *model.UpdateShipperRequest) (*model.ShipperProfile, error) {
	shipper, err := s.repo.UpdateShipper(ctx, userID, req)
	if err != nil {
		s.logger.Error("Failed to update shipper", "error", err, "user_id", userID)
		return nil, err
	}

	s.logger.Info("Shipper updated", "shipper_id", shipper.ID, "user_id", userID)
	return shipper, nil
}

func (s *Service) UpdateStatus(ctx context.Context, userID uuid.UUID, status string) error {
	if err := s.repo.UpdateStatus(ctx, userID, status); err != nil {
		s.logger.Error("Failed to update shipper status", "error", err, "user_id", userID, "status", status)
		return err
	}

	s.logger.Info("Shipper status updated", "user_id", userID, "status", status)
	return nil
}

func (s *Service) DeleteShipper(ctx context.Context, userID uuid.UUID) error {
	if err := s.repo.DeleteShipper(ctx, userID); err != nil {
		s.logger.Error("Failed to delete shipper", "error", err, "user_id", userID)
		return err
	}

	s.logger.Info("Shipper deleted", "user_id", userID)
	return nil
}

func (s *Service) ListShippers(ctx context.Context, status string, limit, offset int) ([]model.ShipperProfile, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	return s.repo.ListShippers(ctx, status, limit, offset)
}
