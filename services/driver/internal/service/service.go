package service

import (
	"github.com/google/uuid"
	"truckify/services/driver/internal/model"
	"truckify/services/driver/internal/repository"
)

type Service struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateDriver(userID uuid.UUID, req *model.CreateDriverRequest) (*model.DriverProfile, error) {
	return s.repo.Create(userID, req)
}

func (s *Service) GetDriver(userID uuid.UUID) (*model.DriverProfile, error) {
	return s.repo.GetByUserID(userID)
}

func (s *Service) GetDriverByID(id uuid.UUID) (*model.DriverProfile, error) {
	return s.repo.GetByID(id)
}

func (s *Service) UpdateDriver(userID uuid.UUID, req *model.UpdateDriverRequest) (*model.DriverProfile, error) {
	return s.repo.Update(userID, req)
}

func (s *Service) UpdateLocation(userID uuid.UUID, req *model.UpdateLocationRequest) error {
	return s.repo.UpdateLocation(userID, req)
}

func (s *Service) AddVehicle(userID uuid.UUID, req *model.AddVehicleRequest) (*model.Vehicle, error) {
	return s.repo.AddVehicle(userID, req)
}

func (s *Service) GetAvailableDrivers(vehicleType string, limit int) ([]*model.DriverProfile, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.GetAvailableDrivers(vehicleType, limit)
}
