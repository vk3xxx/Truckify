package repository

import (
	"context"
	"database/sql"
	"errors"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"truckify/services/tracking/internal/model"
)

var (
	ErrTrackingEventNotFound = errors.New("tracking event not found")
)

// Repository handles tracking data operations
type Repository struct {
	db *sqlx.DB
}

// New creates a new repository instance
func New(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

// CreateTrackingEvent creates a new tracking event
func (r *Repository) CreateTrackingEvent(ctx context.Context, event *model.TrackingEvent) error {
	query := `
		INSERT INTO tracking_events (id, job_id, driver_id, latitude, longitude, speed, heading, timestamp, event_type, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err := r.db.ExecContext(ctx, query,
		event.ID,
		event.JobID,
		event.DriverID,
		event.Latitude,
		event.Longitude,
		event.Speed,
		event.Heading,
		event.Timestamp,
		event.EventType,
		event.CreatedAt,
	)
	return err
}

// GetJobTrackingHistory gets tracking history for a job
func (r *Repository) GetJobTrackingHistory(ctx context.Context, jobID uuid.UUID) ([]model.TrackingEvent, error) {
	query := `
		SELECT id, job_id, driver_id, latitude, longitude, speed, heading, timestamp, event_type, created_at
		FROM tracking_events
		WHERE job_id = $1
		ORDER BY timestamp DESC`

	var events []model.TrackingEvent
	err := r.db.SelectContext(ctx, &events, query, jobID)
	if err != nil {
		return nil, err
	}
	return events, nil
}

// GetDriverCurrentLocation gets the current location of a driver
func (r *Repository) GetDriverCurrentLocation(ctx context.Context, driverID uuid.UUID) (*model.TrackingEvent, error) {
	query := `
		SELECT id, job_id, driver_id, latitude, longitude, speed, heading, timestamp, event_type, created_at
		FROM tracking_events
		WHERE driver_id = $1
		ORDER BY timestamp DESC
		LIMIT 1`

	var event model.TrackingEvent
	err := r.db.GetContext(ctx, &event, query, driverID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrTrackingEventNotFound
		}
		return nil, err
	}
	return &event, nil
}

// GetRecentTrackingEvents gets recent tracking events within a time window
func (r *Repository) GetRecentTrackingEvents(ctx context.Context, since time.Time) ([]model.TrackingEvent, error) {
	query := `
		SELECT id, job_id, driver_id, latitude, longitude, speed, heading, timestamp, event_type, created_at
		FROM tracking_events
		WHERE timestamp >= $1
		ORDER BY timestamp DESC`

	var events []model.TrackingEvent
	err := r.db.SelectContext(ctx, &events, query, since)
	if err != nil {
		return nil, err
	}
	return events, nil
}

// GetLastEvent gets the last tracking event for a job
func (r *Repository) GetLastEvent(ctx context.Context, jobID uuid.UUID) (*model.TrackingEvent, error) {
	query := `
		SELECT id, job_id, driver_id, latitude, longitude, speed, heading, timestamp, event_type, created_at
		FROM tracking_events
		WHERE job_id = $1
		ORDER BY timestamp DESC
		LIMIT 1`

	var event model.TrackingEvent
	err := r.db.GetContext(ctx, &event, query, jobID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &event, nil
}

// GetStops analyzes tracking history to find stops of 5+ minutes
func (r *Repository) GetStops(ctx context.Context, jobID uuid.UUID) ([]model.Stop, error) {
	query := `
		SELECT latitude, longitude, timestamp
		FROM tracking_events
		WHERE job_id = $1 AND event_type = 'location'
		ORDER BY timestamp ASC`

	var events []struct {
		Latitude  float64   `db:"latitude"`
		Longitude float64   `db:"longitude"`
		Timestamp time.Time `db:"timestamp"`
	}
	if err := r.db.SelectContext(ctx, &events, query, jobID); err != nil {
		return nil, err
	}

	// Detect stops: same location (within 100m) for 5+ minutes
	var stops []model.Stop
	if len(events) < 2 {
		return stops, nil
	}

	stopStart := 0
	for i := 1; i < len(events); i++ {
		dist := haversine(events[stopStart].Latitude, events[stopStart].Longitude,
			events[i].Latitude, events[i].Longitude)
		
		if dist > 100 { // Moved more than 100m
			duration := events[i-1].Timestamp.Sub(events[stopStart].Timestamp).Minutes()
			if duration >= 5 {
				stops = append(stops, model.Stop{
					Latitude:  events[stopStart].Latitude,
					Longitude: events[stopStart].Longitude,
					StartTime: events[stopStart].Timestamp,
					Duration:  int(duration),
				})
			}
			stopStart = i
		}
	}
	
	// Check final segment
	duration := events[len(events)-1].Timestamp.Sub(events[stopStart].Timestamp).Minutes()
	if duration >= 5 {
		stops = append(stops, model.Stop{
			Latitude:  events[stopStart].Latitude,
			Longitude: events[stopStart].Longitude,
			StartTime: events[stopStart].Timestamp,
			Duration:  int(duration),
		})
	}

	return stops, nil
}

func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000
	dLat := (lat2 - lat1) * 3.14159265359 / 180
	dLon := (lon2 - lon1) * 3.14159265359 / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*3.14159265359/180)*math.Cos(lat2*3.14159265359/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}