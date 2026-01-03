package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"truckify/services/user/internal/model"
	"truckify/services/user/internal/repository"
	"truckify/shared/pkg/logger"
)

type RepositoryInterface interface {
	CreateProfile(ctx context.Context, profile *model.UserProfile) error
	GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req *model.UpdateProfileRequest) (*model.UserProfile, error)
	DeleteProfile(ctx context.Context, userID uuid.UUID) error
	CreateDocument(ctx context.Context, doc *model.Document) error
	GetDocumentsByUser(ctx context.Context, userID uuid.UUID) ([]model.Document, error)
	GetDocumentsByJob(ctx context.Context, jobID uuid.UUID) ([]model.Document, error)
	GetDocument(ctx context.Context, id uuid.UUID) (*model.Document, error)
	DeleteDocument(ctx context.Context, id uuid.UUID) error
	UpdateDocumentStatus(ctx context.Context, id uuid.UUID, status string) error
}

type Service struct {
	repo   RepositoryInterface
	logger *logger.Logger
}

func New(repo RepositoryInterface, logger *logger.Logger) *Service {
	return &Service{repo: repo, logger: logger}
}

func (s *Service) CreateProfile(ctx context.Context, userID uuid.UUID, req *model.CreateProfileRequest) (*model.UserProfile, error) {
	profile := &model.UserProfile{
		ID:        uuid.New(),
		UserID:    userID,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Phone:     req.Phone,
		Address:   req.Address,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.CreateProfile(ctx, profile); err != nil {
		return nil, err
	}

	s.logger.Info("Profile created", "user_id", userID)
	return profile, nil
}

func (s *Service) GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error) {
	return s.repo.GetProfileByUserID(ctx, userID)
}

func (s *Service) UpdateProfile(ctx context.Context, userID uuid.UUID, req *model.UpdateProfileRequest) (*model.UserProfile, error) {
	profile, err := s.repo.UpdateProfile(ctx, userID, req)
	if err != nil {
		return nil, err
	}
	s.logger.Info("Profile updated", "user_id", userID)
	return profile, nil
}

func (s *Service) DeleteProfile(ctx context.Context, userID uuid.UUID) error {
	if err := s.repo.DeleteProfile(ctx, userID); err != nil {
		return err
	}
	s.logger.Info("Profile deleted", "user_id", userID)
	return nil
}

var (
	ErrProfileNotFound = repository.ErrProfileNotFound
	ErrProfileExists   = repository.ErrProfileExists
)

// Document methods
func (s *Service) CreateDocument(ctx context.Context, doc *model.Document) error {
	doc.ID = uuid.New()
	doc.Status = "pending"
	doc.CreatedAt = time.Now()
	doc.UpdatedAt = time.Now()
	return s.repo.CreateDocument(ctx, doc)
}

func (s *Service) GetUserDocuments(ctx context.Context, userID uuid.UUID) ([]model.Document, error) {
	return s.repo.GetDocumentsByUser(ctx, userID)
}

func (s *Service) GetJobDocuments(ctx context.Context, jobID uuid.UUID) ([]model.Document, error) {
	return s.repo.GetDocumentsByJob(ctx, jobID)
}

func (s *Service) GetDocument(ctx context.Context, id uuid.UUID) (*model.Document, error) {
	return s.repo.GetDocument(ctx, id)
}

func (s *Service) DeleteDocument(ctx context.Context, id, userID uuid.UUID) error {
	doc, err := s.repo.GetDocument(ctx, id)
	if err != nil || doc == nil {
		return ErrProfileNotFound
	}
	if doc.UserID != userID {
		return ErrProfileNotFound
	}
	return s.repo.DeleteDocument(ctx, id)
}

func (s *Service) VerifyDocument(ctx context.Context, id uuid.UUID, status string) error {
	return s.repo.UpdateDocumentStatus(ctx, id, status)
}
