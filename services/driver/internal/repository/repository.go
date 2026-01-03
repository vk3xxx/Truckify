package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/driver/internal/model"
)

var (
	ErrNotFound      = errors.New("driver not found")
	ErrAlreadyExists = errors.New("driver profile already exists")
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(userID uuid.UUID, req *model.CreateDriverRequest) (*model.DriverProfile, error) {
	id := uuid.New()
	now := time.Now()

	expiry, err := time.Parse("2006-01-02", req.LicenseExpiry)
	if err != nil {
		return nil, err
	}

	driver := &model.DriverProfile{
		ID:              id,
		UserID:          userID,
		LicenseNumber:   req.LicenseNumber,
		LicenseState:    req.LicenseState,
		LicenseExpiry:   expiry,
		LicenseClass:    req.LicenseClass,
		YearsExperience: req.YearsExperience,
		IsAvailable:     false,
		Rating:          0,
		TotalTrips:      0,
		Status:          "pending",
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	_, err = r.db.Exec(`
		INSERT INTO drivers (id, user_id, license_number, license_state, license_expiry, license_class, 
			years_experience, is_available, rating, total_trips, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		driver.ID, driver.UserID, driver.LicenseNumber, driver.LicenseState, driver.LicenseExpiry,
		driver.LicenseClass, driver.YearsExperience, driver.IsAvailable, driver.Rating,
		driver.TotalTrips, driver.Status, driver.CreatedAt, driver.UpdatedAt)
	if err != nil {
		return nil, err
	}

	return driver, nil
}

func (r *Repository) GetByUserID(userID uuid.UUID) (*model.DriverProfile, error) {
	driver := &model.DriverProfile{}
	var locationJSON, vehicleJSON sql.NullString

	err := r.db.QueryRow(`
		SELECT d.id, d.user_id, d.license_number, d.license_state, d.license_expiry, d.license_class,
			d.years_experience, d.is_available, d.current_location, d.rating, d.total_trips, d.status,
			d.created_at, d.updated_at, v.vehicle_json
		FROM drivers d
		LEFT JOIN (
			SELECT driver_id, row_to_json(vehicles.*) as vehicle_json 
			FROM vehicles WHERE driver_id = $1 LIMIT 1
		) v ON v.driver_id = d.id
		WHERE d.user_id = $1`, userID).Scan(
		&driver.ID, &driver.UserID, &driver.LicenseNumber, &driver.LicenseState, &driver.LicenseExpiry,
		&driver.LicenseClass, &driver.YearsExperience, &driver.IsAvailable, &locationJSON,
		&driver.Rating, &driver.TotalTrips, &driver.Status, &driver.CreatedAt, &driver.UpdatedAt, &vehicleJSON)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if locationJSON.Valid {
		json.Unmarshal([]byte(locationJSON.String), &driver.CurrentLocation)
	}
	if vehicleJSON.Valid {
		json.Unmarshal([]byte(vehicleJSON.String), &driver.Vehicle)
	}

	return driver, nil
}

func (r *Repository) GetByID(id uuid.UUID) (*model.DriverProfile, error) {
	driver := &model.DriverProfile{}
	var locationJSON sql.NullString

	err := r.db.QueryRow(`
		SELECT id, user_id, license_number, license_state, license_expiry, license_class,
			years_experience, is_available, current_location, rating, total_trips, status,
			created_at, updated_at
		FROM drivers WHERE id = $1`, id).Scan(
		&driver.ID, &driver.UserID, &driver.LicenseNumber, &driver.LicenseState, &driver.LicenseExpiry,
		&driver.LicenseClass, &driver.YearsExperience, &driver.IsAvailable, &locationJSON,
		&driver.Rating, &driver.TotalTrips, &driver.Status, &driver.CreatedAt, &driver.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if locationJSON.Valid {
		json.Unmarshal([]byte(locationJSON.String), &driver.CurrentLocation)
	}

	return driver, nil
}

func (r *Repository) Update(userID uuid.UUID, req *model.UpdateDriverRequest) (*model.DriverProfile, error) {
	driver, err := r.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	if req.LicenseNumber != nil {
		driver.LicenseNumber = *req.LicenseNumber
	}
	if req.LicenseState != nil {
		driver.LicenseState = *req.LicenseState
	}
	if req.LicenseExpiry != nil {
		expiry, _ := time.Parse("2006-01-02", *req.LicenseExpiry)
		driver.LicenseExpiry = expiry
	}
	if req.LicenseClass != nil {
		driver.LicenseClass = *req.LicenseClass
	}
	if req.YearsExperience != nil {
		driver.YearsExperience = *req.YearsExperience
	}
	if req.IsAvailable != nil {
		driver.IsAvailable = *req.IsAvailable
	}
	driver.UpdatedAt = time.Now()

	_, err = r.db.Exec(`
		UPDATE drivers SET license_number=$1, license_state=$2, license_expiry=$3, license_class=$4,
			years_experience=$5, is_available=$6, updated_at=$7 WHERE user_id=$8`,
		driver.LicenseNumber, driver.LicenseState, driver.LicenseExpiry, driver.LicenseClass,
		driver.YearsExperience, driver.IsAvailable, driver.UpdatedAt, userID)
	if err != nil {
		return nil, err
	}

	return driver, nil
}

func (r *Repository) UpdateLocation(userID uuid.UUID, req *model.UpdateLocationRequest) error {
	locationJSON, _ := json.Marshal(model.Location{Lat: req.Lat, Lng: req.Lng, Address: req.Address})
	_, err := r.db.Exec(`UPDATE drivers SET current_location=$1, updated_at=$2 WHERE user_id=$3`,
		locationJSON, time.Now(), userID)
	return err
}

func (r *Repository) AddVehicle(userID uuid.UUID, req *model.AddVehicleRequest) (*model.Vehicle, error) {
	driver, err := r.GetByUserID(userID)
	if err != nil {
		return nil, err
	}

	regoExp, _ := time.Parse("2006-01-02", req.RegoExpiry)
	insExp, _ := time.Parse("2006-01-02", req.InsuranceExp)

	vehicle := &model.Vehicle{
		ID:           uuid.New(),
		DriverID:     driver.ID,
		Type:         req.Type,
		Make:         req.Make,
		Model:        req.Model,
		Year:         req.Year,
		Plate:        req.Plate,
		Capacity:     req.Capacity,
		RegoExpiry:   regoExp,
		InsuranceExp: insExp,
		CreatedAt:    time.Now(),
	}

	_, err = r.db.Exec(`
		INSERT INTO vehicles (id, driver_id, type, make, model, year, plate, capacity, rego_expiry, insurance_expiry, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		vehicle.ID, vehicle.DriverID, vehicle.Type, vehicle.Make, vehicle.Model, vehicle.Year,
		vehicle.Plate, vehicle.Capacity, vehicle.RegoExpiry, vehicle.InsuranceExp, vehicle.CreatedAt)
	if err != nil {
		return nil, err
	}

	return vehicle, nil
}

func (r *Repository) GetAvailableDrivers(vehicleType string, limit int) ([]*model.DriverProfile, error) {
	query := `
		SELECT d.id, d.user_id, d.license_number, d.license_state, d.license_expiry, d.license_class,
			d.years_experience, d.is_available, d.current_location, d.rating, d.total_trips, d.status,
			d.created_at, d.updated_at
		FROM drivers d
		JOIN vehicles v ON v.driver_id = d.id
		WHERE d.is_available = true AND d.status = 'approved'`

	args := []interface{}{}
	if vehicleType != "" {
		query += " AND v.type = $1"
		args = append(args, vehicleType)
	}
	query += " ORDER BY d.rating DESC LIMIT $" + string(rune('0'+len(args)+1))
	args = append(args, limit)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []*model.DriverProfile
	for rows.Next() {
		d := &model.DriverProfile{}
		var locationJSON sql.NullString
		rows.Scan(&d.ID, &d.UserID, &d.LicenseNumber, &d.LicenseState, &d.LicenseExpiry,
			&d.LicenseClass, &d.YearsExperience, &d.IsAvailable, &locationJSON,
			&d.Rating, &d.TotalTrips, &d.Status, &d.CreatedAt, &d.UpdatedAt)
		if locationJSON.Valid {
			json.Unmarshal([]byte(locationJSON.String), &d.CurrentLocation)
		}
		drivers = append(drivers, d)
	}

	return drivers, nil
}
