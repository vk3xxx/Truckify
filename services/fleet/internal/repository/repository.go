package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/fleet/internal/model"
)

var (
	ErrNotFound      = errors.New("not found")
	ErrAlreadyExists = errors.New("already exists")
	ErrUnauthorized  = errors.New("unauthorized")
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Fleet operations
func (r *Repository) CreateFleet(ownerID uuid.UUID, req *model.CreateFleetRequest) (*model.Fleet, error) {
	fleet := &model.Fleet{
		ID:        uuid.New(),
		OwnerID:   ownerID,
		Name:      req.Name,
		ABN:       req.ABN,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := r.db.Exec(`INSERT INTO fleets (id, owner_id, name, abn, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		fleet.ID, fleet.OwnerID, fleet.Name, fleet.ABN, fleet.Status, fleet.CreatedAt, fleet.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return fleet, nil
}

func (r *Repository) GetFleetByOwner(ownerID uuid.UUID) (*model.Fleet, error) {
	fleet := &model.Fleet{}
	err := r.db.QueryRow(`SELECT id, owner_id, name, abn, status, created_at, updated_at 
		FROM fleets WHERE owner_id = $1`, ownerID).Scan(
		&fleet.ID, &fleet.OwnerID, &fleet.Name, &fleet.ABN, &fleet.Status, &fleet.CreatedAt, &fleet.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return fleet, err
}

func (r *Repository) GetFleetByID(id uuid.UUID) (*model.Fleet, error) {
	fleet := &model.Fleet{}
	err := r.db.QueryRow(`SELECT id, owner_id, name, abn, status, created_at, updated_at 
		FROM fleets WHERE id = $1`, id).Scan(
		&fleet.ID, &fleet.OwnerID, &fleet.Name, &fleet.ABN, &fleet.Status, &fleet.CreatedAt, &fleet.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return fleet, err
}

// Vehicle operations
func (r *Repository) CreateVehicle(fleetID uuid.UUID, req *model.CreateVehicleRequest) (*model.FleetVehicle, error) {
	regoExp, _ := time.Parse("2006-01-02", req.RegoExpiry)
	insExp, _ := time.Parse("2006-01-02", req.InsuranceExpiry)

	v := &model.FleetVehicle{
		ID:              uuid.New(),
		FleetID:         fleetID,
		Type:            req.Type,
		Make:            req.Make,
		Model:           req.Model,
		Year:            req.Year,
		Plate:           req.Plate,
		VIN:             req.VIN,
		Capacity:        req.Capacity,
		RegoExpiry:      regoExp,
		InsuranceExpiry: insExp,
		Status:          "available",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	_, err := r.db.Exec(`INSERT INTO fleet_vehicles 
		(id, fleet_id, type, make, model, year, plate, vin, capacity, rego_expiry, insurance_expiry, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		v.ID, v.FleetID, v.Type, v.Make, v.Model, v.Year, v.Plate, v.VIN, v.Capacity, v.RegoExpiry, v.InsuranceExpiry, v.Status, v.CreatedAt, v.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return v, nil
}

func (r *Repository) GetFleetVehicles(fleetID uuid.UUID) ([]*model.FleetVehicle, error) {
	rows, err := r.db.Query(`SELECT id, fleet_id, current_driver_id, type, make, model, year, plate, vin, 
		capacity, rego_expiry, insurance_expiry, status, current_location, created_at, updated_at
		FROM fleet_vehicles WHERE fleet_id = $1 ORDER BY created_at DESC`, fleetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []*model.FleetVehicle
	for rows.Next() {
		v := &model.FleetVehicle{}
		var driverID sql.NullString
		var vin sql.NullString
		var locationJSON sql.NullString
		err := rows.Scan(&v.ID, &v.FleetID, &driverID, &v.Type, &v.Make, &v.Model, &v.Year, &v.Plate, &vin,
			&v.Capacity, &v.RegoExpiry, &v.InsuranceExpiry, &v.Status, &locationJSON, &v.CreatedAt, &v.UpdatedAt)
		if err != nil {
			return nil, err
		}
		if driverID.Valid {
			id, _ := uuid.Parse(driverID.String)
			v.CurrentDriverID = &id
		}
		if vin.Valid {
			v.VIN = vin.String
		}
		if locationJSON.Valid {
			json.Unmarshal([]byte(locationJSON.String), &v.Location)
		}
		vehicles = append(vehicles, v)
	}
	return vehicles, nil
}

func (r *Repository) GetVehicle(id uuid.UUID) (*model.FleetVehicle, error) {
	v := &model.FleetVehicle{}
	var driverID sql.NullString
	var vin sql.NullString
	var locationJSON sql.NullString

	err := r.db.QueryRow(`SELECT id, fleet_id, current_driver_id, type, make, model, year, plate, vin, 
		capacity, rego_expiry, insurance_expiry, status, current_location, created_at, updated_at
		FROM fleet_vehicles WHERE id = $1`, id).Scan(
		&v.ID, &v.FleetID, &driverID, &v.Type, &v.Make, &v.Model, &v.Year, &v.Plate, &vin,
		&v.Capacity, &v.RegoExpiry, &v.InsuranceExpiry, &v.Status, &locationJSON, &v.CreatedAt, &v.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if driverID.Valid {
		id, _ := uuid.Parse(driverID.String)
		v.CurrentDriverID = &id
	}
	if vin.Valid {
		v.VIN = vin.String
	}
	if locationJSON.Valid {
		json.Unmarshal([]byte(locationJSON.String), &v.Location)
	}
	return v, nil
}

func (r *Repository) AssignVehicle(vehicleID, driverID uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE fleet_vehicles SET current_driver_id = $1, status = 'in_use', updated_at = $2 WHERE id = $3`,
		driverID, time.Now(), vehicleID)
	return err
}

func (r *Repository) UnassignVehicle(vehicleID uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE fleet_vehicles SET current_driver_id = NULL, status = 'available', updated_at = $1 WHERE id = $2`,
		time.Now(), vehicleID)
	return err
}

// Driver operations
func (r *Repository) AddDriver(fleetID uuid.UUID, req *model.AddDriverRequest) (*model.FleetDriver, error) {
	fd := &model.FleetDriver{
		ID:       uuid.New(),
		FleetID:  fleetID,
		DriverID: req.DriverID,
		UserID:   req.UserID,
		Status:   "active",
		JoinedAt: time.Now(),
	}

	_, err := r.db.Exec(`INSERT INTO fleet_drivers (id, fleet_id, driver_id, user_id, status, joined_at)
		VALUES ($1, $2, $3, $4, $5, $6)`, fd.ID, fd.FleetID, fd.DriverID, fd.UserID, fd.Status, fd.JoinedAt)
	if err != nil {
		return nil, err
	}
	return fd, nil
}

func (r *Repository) GetFleetDrivers(fleetID uuid.UUID) ([]*model.FleetDriver, error) {
	rows, err := r.db.Query(`SELECT id, fleet_id, driver_id, user_id, status, joined_at 
		FROM fleet_drivers WHERE fleet_id = $1 AND status = 'active' ORDER BY joined_at DESC`, fleetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []*model.FleetDriver
	for rows.Next() {
		d := &model.FleetDriver{}
		if err := rows.Scan(&d.ID, &d.FleetID, &d.DriverID, &d.UserID, &d.Status, &d.JoinedAt); err != nil {
			return nil, err
		}
		drivers = append(drivers, d)
	}
	return drivers, nil
}

func (r *Repository) RemoveDriver(fleetID, driverID uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE fleet_drivers SET status = 'removed' WHERE fleet_id = $1 AND driver_id = $2`, fleetID, driverID)
	return err
}

func (r *Repository) GetDriverFleet(driverID uuid.UUID) (*model.Fleet, error) {
	fleet := &model.Fleet{}
	err := r.db.QueryRow(`SELECT f.id, f.owner_id, f.name, f.abn, f.status, f.created_at, f.updated_at 
		FROM fleets f JOIN fleet_drivers fd ON f.id = fd.fleet_id 
		WHERE fd.driver_id = $1 AND fd.status = 'active'`, driverID).Scan(
		&fleet.ID, &fleet.OwnerID, &fleet.Name, &fleet.ABN, &fleet.Status, &fleet.CreatedAt, &fleet.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return fleet, err
}

func (r *Repository) IsFleetDriver(fleetID, driverID uuid.UUID) bool {
	var count int
	r.db.QueryRow(`SELECT COUNT(*) FROM fleet_drivers WHERE fleet_id = $1 AND driver_id = $2 AND status = 'active'`,
		fleetID, driverID).Scan(&count)
	return count > 0
}

// Handover operations
func (r *Repository) CreateHandover(req *model.HandoverRequest, fromDriverID *uuid.UUID) (*model.VehicleHandover, error) {
	h := &model.VehicleHandover{
		ID:           uuid.New(),
		VehicleID:    req.VehicleID,
		JobID:        req.JobID,
		FromDriverID: fromDriverID,
		ToDriverID:   req.ToDriverID,
		Status:       "pending",
		Notes:        req.Notes,
		RequestedAt:  time.Now(),
	}

	_, err := r.db.Exec(`INSERT INTO vehicle_handovers (id, vehicle_id, job_id, from_driver_id, to_driver_id, status, notes, requested_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		h.ID, h.VehicleID, h.JobID, h.FromDriverID, h.ToDriverID, h.Status, h.Notes, h.RequestedAt)
	if err != nil {
		return nil, err
	}
	return h, nil
}

func (r *Repository) GetPendingHandovers(driverID uuid.UUID) ([]*model.VehicleHandover, error) {
	rows, err := r.db.Query(`SELECT id, vehicle_id, job_id, from_driver_id, to_driver_id, status, location, notes, requested_at, completed_at
		FROM vehicle_handovers WHERE to_driver_id = $1 AND status = 'pending' ORDER BY requested_at DESC`, driverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var handovers []*model.VehicleHandover
	for rows.Next() {
		h := &model.VehicleHandover{}
		var jobID, fromDriverID sql.NullString
		var locationJSON sql.NullString
		var completedAt sql.NullTime
		if err := rows.Scan(&h.ID, &h.VehicleID, &jobID, &fromDriverID, &h.ToDriverID, &h.Status, &locationJSON, &h.Notes, &h.RequestedAt, &completedAt); err != nil {
			return nil, err
		}
		if jobID.Valid {
			id, _ := uuid.Parse(jobID.String)
			h.JobID = &id
		}
		if fromDriverID.Valid {
			id, _ := uuid.Parse(fromDriverID.String)
			h.FromDriverID = &id
		}
		if locationJSON.Valid {
			json.Unmarshal([]byte(locationJSON.String), &h.Location)
		}
		if completedAt.Valid {
			h.CompletedAt = &completedAt.Time
		}
		handovers = append(handovers, h)
	}
	return handovers, nil
}

func (r *Repository) GetHandover(id uuid.UUID) (*model.VehicleHandover, error) {
	h := &model.VehicleHandover{}
	var jobID, fromDriverID sql.NullString
	var locationJSON sql.NullString
	var completedAt sql.NullTime

	err := r.db.QueryRow(`SELECT id, vehicle_id, job_id, from_driver_id, to_driver_id, status, location, notes, requested_at, completed_at
		FROM vehicle_handovers WHERE id = $1`, id).Scan(
		&h.ID, &h.VehicleID, &jobID, &fromDriverID, &h.ToDriverID, &h.Status, &locationJSON, &h.Notes, &h.RequestedAt, &completedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if jobID.Valid {
		id, _ := uuid.Parse(jobID.String)
		h.JobID = &id
	}
	if fromDriverID.Valid {
		id, _ := uuid.Parse(fromDriverID.String)
		h.FromDriverID = &id
	}
	if locationJSON.Valid {
		json.Unmarshal([]byte(locationJSON.String), &h.Location)
	}
	if completedAt.Valid {
		h.CompletedAt = &completedAt.Time
	}
	return h, nil
}

func (r *Repository) AcceptHandover(id uuid.UUID) error {
	now := time.Now()
	_, err := r.db.Exec(`UPDATE vehicle_handovers SET status = 'accepted', completed_at = $1 WHERE id = $2`, now, id)
	return err
}

func (r *Repository) RejectHandover(id uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE vehicle_handovers SET status = 'rejected' WHERE id = $1`, id)
	return err
}
