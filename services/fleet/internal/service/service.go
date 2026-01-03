package service

import (
	"github.com/google/uuid"
	"truckify/services/fleet/internal/model"
	"truckify/services/fleet/internal/repository"
)

type Service struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateFleet(ownerID uuid.UUID, req *model.CreateFleetRequest) (*model.Fleet, error) {
	return s.repo.CreateFleet(ownerID, req)
}

func (s *Service) GetMyFleet(ownerID uuid.UUID) (*model.Fleet, error) {
	return s.repo.GetFleetByOwner(ownerID)
}

func (s *Service) GetFleet(id uuid.UUID) (*model.Fleet, error) {
	return s.repo.GetFleetByID(id)
}

func (s *Service) CreateVehicle(fleetID uuid.UUID, req *model.CreateVehicleRequest) (*model.FleetVehicle, error) {
	return s.repo.CreateVehicle(fleetID, req)
}

func (s *Service) GetFleetVehicles(fleetID uuid.UUID) ([]*model.FleetVehicle, error) {
	return s.repo.GetFleetVehicles(fleetID)
}

func (s *Service) GetVehicle(id uuid.UUID) (*model.FleetVehicle, error) {
	return s.repo.GetVehicle(id)
}

func (s *Service) AssignVehicle(vehicleID, driverID, fleetID uuid.UUID) error {
	// Verify driver is in fleet
	if !s.repo.IsFleetDriver(fleetID, driverID) {
		return repository.ErrUnauthorized
	}
	return s.repo.AssignVehicle(vehicleID, driverID)
}

func (s *Service) UnassignVehicle(vehicleID uuid.UUID) error {
	return s.repo.UnassignVehicle(vehicleID)
}

func (s *Service) AddDriver(fleetID uuid.UUID, req *model.AddDriverRequest) (*model.FleetDriver, error) {
	return s.repo.AddDriver(fleetID, req)
}

func (s *Service) GetFleetDrivers(fleetID uuid.UUID) ([]*model.FleetDriver, error) {
	return s.repo.GetFleetDrivers(fleetID)
}

func (s *Service) RemoveDriver(fleetID, driverID uuid.UUID) error {
	return s.repo.RemoveDriver(fleetID, driverID)
}

func (s *Service) GetDriverFleet(driverID uuid.UUID) (*model.Fleet, error) {
	return s.repo.GetDriverFleet(driverID)
}

func (s *Service) RequestHandover(req *model.HandoverRequest, fromDriverID *uuid.UUID) (*model.VehicleHandover, error) {
	return s.repo.CreateHandover(req, fromDriverID)
}

func (s *Service) GetPendingHandovers(driverID uuid.UUID) ([]*model.VehicleHandover, error) {
	return s.repo.GetPendingHandovers(driverID)
}

func (s *Service) AcceptHandover(handoverID, driverID uuid.UUID) error {
	h, err := s.repo.GetHandover(handoverID)
	if err != nil {
		return err
	}
	if h.ToDriverID != driverID {
		return repository.ErrUnauthorized
	}
	if err := s.repo.AcceptHandover(handoverID); err != nil {
		return err
	}
	return s.repo.AssignVehicle(h.VehicleID, driverID)
}

func (s *Service) RejectHandover(handoverID, driverID uuid.UUID) error {
	h, err := s.repo.GetHandover(handoverID)
	if err != nil {
		return err
	}
	if h.ToDriverID != driverID {
		return repository.ErrUnauthorized
	}
	return s.repo.RejectHandover(handoverID)
}

func (s *Service) IsFleetOwner(fleetID, userID uuid.UUID) bool {
	fleet, err := s.repo.GetFleetByID(fleetID)
	if err != nil {
		return false
	}
	return fleet.OwnerID == userID
}
