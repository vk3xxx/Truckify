package service

import (
	"github.com/google/uuid"
	"truckify/services/job/internal/model"
	"truckify/services/job/internal/repository"
)

type Service struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateJob(shipperID uuid.UUID, req *model.CreateJobRequest) (*model.Job, error) {
	return s.repo.Create(shipperID, req)
}

func (s *Service) GetJob(id uuid.UUID) (*model.Job, error) {
	return s.repo.GetByID(id)
}

func (s *Service) ListJobs(filter model.JobFilter) ([]*model.Job, error) {
	return s.repo.List(filter)
}

func (s *Service) UpdateJob(id uuid.UUID, req *model.UpdateJobRequest) (*model.Job, error) {
	return s.repo.Update(id, req)
}

func (s *Service) AssignDriver(jobID, driverID uuid.UUID) error {
	return s.repo.AssignDriver(jobID, driverID)
}

func (s *Service) DeleteJob(id uuid.UUID) error {
	return s.repo.Delete(id)
}

func (s *Service) UpdateStatus(id uuid.UUID, status string) (*model.Job, error) {
	return s.repo.UpdateStatus(id, status)
}
