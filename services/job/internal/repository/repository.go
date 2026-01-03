package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/job/internal/model"
)

var ErrNotFound = errors.New("job not found")

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(shipperID uuid.UUID, req *model.CreateJobRequest) (*model.Job, error) {
	id := uuid.New()
	now := time.Now()
	pickupDate, _ := time.Parse("2006-01-02", req.PickupDate)
	deliveryDate, _ := time.Parse("2006-01-02", req.DeliveryDate)

	pickup := model.Location{City: req.PickupCity, State: req.PickupState, Address: req.PickupAddress}
	delivery := model.Location{City: req.DeliveryCity, State: req.DeliveryState, Address: req.DeliveryAddr}
	pickupJSON, _ := json.Marshal(pickup)
	deliveryJSON, _ := json.Marshal(delivery)

	job := &model.Job{
		ID: id, ShipperID: shipperID, Status: "pending",
		Pickup: pickup, Delivery: delivery,
		PickupDate: pickupDate, DeliveryDate: deliveryDate,
		CargoType: req.CargoType, Weight: req.Weight, VehicleType: req.VehicleType,
		Price: req.Price, Distance: req.Distance, Notes: req.Notes,
		CreatedAt: now, UpdatedAt: now,
	}

	_, err := r.db.Exec(`
		INSERT INTO jobs (id, shipper_id, status, pickup, delivery, pickup_date, delivery_date,
			cargo_type, weight, vehicle_type, price, distance, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
		job.ID, job.ShipperID, job.Status, pickupJSON, deliveryJSON, job.PickupDate, job.DeliveryDate,
		job.CargoType, job.Weight, job.VehicleType, job.Price, job.Distance, job.Notes, job.CreatedAt, job.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (r *Repository) GetByID(id uuid.UUID) (*model.Job, error) {
	job := &model.Job{}
	var pickupJSON, deliveryJSON []byte
	var driverID sql.NullString

	err := r.db.QueryRow(`
		SELECT id, shipper_id, driver_id, status, pickup, delivery, pickup_date, delivery_date,
			cargo_type, weight, vehicle_type, price, distance, notes, created_at, updated_at
		FROM jobs WHERE id = $1`, id).Scan(
		&job.ID, &job.ShipperID, &driverID, &job.Status, &pickupJSON, &deliveryJSON,
		&job.PickupDate, &job.DeliveryDate, &job.CargoType, &job.Weight, &job.VehicleType,
		&job.Price, &job.Distance, &job.Notes, &job.CreatedAt, &job.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	json.Unmarshal(pickupJSON, &job.Pickup)
	json.Unmarshal(deliveryJSON, &job.Delivery)
	if driverID.Valid {
		uid, _ := uuid.Parse(driverID.String)
		job.DriverID = &uid
	}
	return job, nil
}

func (r *Repository) List(filter model.JobFilter) ([]*model.Job, error) {
	query := `SELECT id, shipper_id, driver_id, status, pickup, delivery, pickup_date, delivery_date,
		cargo_type, weight, vehicle_type, price, distance, notes, created_at, updated_at FROM jobs WHERE 1=1`
	args := []interface{}{}
	argNum := 1

	if filter.Status != "" {
		query += " AND status = $" + string(rune('0'+argNum))
		args = append(args, filter.Status)
		argNum++
	}
	if filter.VehicleType != "" {
		query += " AND vehicle_type = $" + string(rune('0'+argNum))
		args = append(args, filter.VehicleType)
		argNum++
	}
	if filter.ShipperID != uuid.Nil {
		query += " AND shipper_id = $" + string(rune('0'+argNum))
		args = append(args, filter.ShipperID)
		argNum++
	}
	if filter.DriverID != uuid.Nil {
		query += " AND driver_id = $" + string(rune('0'+argNum))
		args = append(args, filter.DriverID)
		argNum++
	}

	query += " ORDER BY created_at DESC"
	if filter.Limit > 0 {
		query += " LIMIT " + string(rune('0'+filter.Limit))
	} else {
		query += " LIMIT 50"
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []*model.Job
	for rows.Next() {
		job := &model.Job{}
		var pickupJSON, deliveryJSON []byte
		var driverID sql.NullString
		rows.Scan(&job.ID, &job.ShipperID, &driverID, &job.Status, &pickupJSON, &deliveryJSON,
			&job.PickupDate, &job.DeliveryDate, &job.CargoType, &job.Weight, &job.VehicleType,
			&job.Price, &job.Distance, &job.Notes, &job.CreatedAt, &job.UpdatedAt)
		json.Unmarshal(pickupJSON, &job.Pickup)
		json.Unmarshal(deliveryJSON, &job.Delivery)
		if driverID.Valid {
			uid, _ := uuid.Parse(driverID.String)
			job.DriverID = &uid
		}
		jobs = append(jobs, job)
	}
	return jobs, nil
}

func (r *Repository) Update(id uuid.UUID, req *model.UpdateJobRequest) (*model.Job, error) {
	job, err := r.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.Status != nil {
		job.Status = *req.Status
	}
	if req.PickupDate != nil {
		job.PickupDate, _ = time.Parse("2006-01-02", *req.PickupDate)
	}
	if req.DeliveryDate != nil {
		job.DeliveryDate, _ = time.Parse("2006-01-02", *req.DeliveryDate)
	}
	if req.Price != nil {
		job.Price = *req.Price
	}
	if req.Notes != nil {
		job.Notes = *req.Notes
	}
	job.UpdatedAt = time.Now()

	_, err = r.db.Exec(`UPDATE jobs SET status=$1, pickup_date=$2, delivery_date=$3, price=$4, notes=$5, updated_at=$6 WHERE id=$7`,
		job.Status, job.PickupDate, job.DeliveryDate, job.Price, job.Notes, job.UpdatedAt, id)
	return job, err
}

func (r *Repository) AssignDriver(jobID, driverID uuid.UUID) error {
	_, err := r.db.Exec(`UPDATE jobs SET driver_id=$1, status='assigned', updated_at=$2 WHERE id=$3`,
		driverID, time.Now(), jobID)
	return err
}

func (r *Repository) Delete(id uuid.UUID) error {
	result, err := r.db.Exec(`DELETE FROM jobs WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) UpdateStatus(id uuid.UUID, status string) (*model.Job, error) {
	_, err := r.db.Exec(`UPDATE jobs SET status=$1, updated_at=$2 WHERE id=$3`, status, time.Now(), id)
	if err != nil {
		return nil, err
	}
	return r.GetByID(id)
}
