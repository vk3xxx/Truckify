package service

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/bidding/internal/model"
	"truckify/services/bidding/internal/repository"
)

var (
	ErrBidNotFound     = errors.New("bid not found")
	ErrBidExists       = errors.New("you already have a bid on this job")
	ErrNotBidOwner     = errors.New("not authorized to modify this bid")
	ErrBidNotPending   = errors.New("bid is no longer pending")
	ErrInvalidBidState = errors.New("invalid bid state for this operation")
)

type Service struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateBid(ctx context.Context, driverID uuid.UUID, req model.CreateBidRequest) (*model.Bid, error) {
	existing, _ := s.repo.GetByJobAndDriver(ctx, req.JobID, driverID)
	if existing != nil {
		return nil, ErrBidExists
	}

	bid := &model.Bid{
		ID:        uuid.New(),
		JobID:     req.JobID,
		DriverID:  driverID,
		Amount:    req.Amount,
		Notes:     req.Notes,
		Status:    model.BidStatusPending,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.Create(ctx, bid); err != nil {
		return nil, err
	}
	return bid, nil
}

func (s *Service) GetBid(ctx context.Context, id uuid.UUID) (*model.Bid, error) {
	bid, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if bid == nil {
		return nil, ErrBidNotFound
	}
	return bid, nil
}

func (s *Service) GetBidsForJob(ctx context.Context, jobID uuid.UUID) ([]model.Bid, error) {
	return s.repo.GetByJobID(ctx, jobID)
}

func (s *Service) GetDriverBids(ctx context.Context, driverID uuid.UUID) ([]model.Bid, error) {
	return s.repo.GetByDriverID(ctx, driverID)
}

func (s *Service) UpdateBid(ctx context.Context, bidID, driverID uuid.UUID, req model.UpdateBidRequest) (*model.Bid, error) {
	bid, err := s.repo.GetByID(ctx, bidID)
	if err != nil || bid == nil {
		return nil, ErrBidNotFound
	}
	if bid.DriverID != driverID {
		return nil, ErrNotBidOwner
	}
	if bid.Status != model.BidStatusPending {
		return nil, ErrBidNotPending
	}

	bid.Amount = req.Amount
	bid.Notes = req.Notes
	bid.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, bid); err != nil {
		return nil, err
	}
	return bid, nil
}

func (s *Service) WithdrawBid(ctx context.Context, bidID, driverID uuid.UUID) error {
	bid, err := s.repo.GetByID(ctx, bidID)
	if err != nil || bid == nil {
		return ErrBidNotFound
	}
	if bid.DriverID != driverID {
		return ErrNotBidOwner
	}
	if bid.Status != model.BidStatusPending {
		return ErrBidNotPending
	}
	return s.repo.Delete(ctx, bidID)
}

func (s *Service) AcceptBid(ctx context.Context, bidID uuid.UUID) (*model.Bid, error) {
	bid, err := s.repo.GetByID(ctx, bidID)
	if err != nil || bid == nil {
		return nil, ErrBidNotFound
	}
	if bid.Status != model.BidStatusPending {
		return nil, ErrBidNotPending
	}

	if err := s.repo.UpdateStatus(ctx, bidID, model.BidStatusAccepted); err != nil {
		return nil, err
	}
	s.repo.RejectOtherBids(ctx, bid.JobID, bidID)

	bid.Status = model.BidStatusAccepted
	return bid, nil
}

func (s *Service) RejectBid(ctx context.Context, bidID uuid.UUID) error {
	bid, err := s.repo.GetByID(ctx, bidID)
	if err != nil || bid == nil {
		return ErrBidNotFound
	}
	if bid.Status != model.BidStatusPending {
		return ErrBidNotPending
	}
	return s.repo.UpdateStatus(ctx, bidID, model.BidStatusRejected)
}
