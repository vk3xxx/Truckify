package model

import (
	"time"

	"github.com/google/uuid"
)

// EventType represents the type of tracking event
type EventType string

const (
	EventTypeLocation   EventType = "location"
	EventTypeGeofence   EventType = "geofence"
	EventTypeSpeedAlert EventType = "speed_alert"
	EventTypeJobStart   EventType = "job_start"
	EventTypeJobEnd     EventType = "job_end"
	EventTypeStop       EventType = "stop"
)

// TrackingEvent represents a GPS tracking event
type TrackingEvent struct {
	ID        uuid.UUID `db:"id" json:"id"`
	JobID     uuid.UUID `db:"job_id" json:"job_id"`
	DriverID  uuid.UUID `db:"driver_id" json:"driver_id"`
	Latitude  float64   `db:"latitude" json:"latitude"`
	Longitude float64   `db:"longitude" json:"longitude"`
	Speed     float64   `db:"speed" json:"speed"`
	Heading   float64   `db:"heading" json:"heading"`
	Timestamp time.Time `db:"timestamp" json:"timestamp"`
	EventType EventType `db:"event_type" json:"event_type"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// LocationUpdateRequest represents a location update request
type LocationUpdateRequest struct {
	JobID     uuid.UUID `json:"job_id" validate:"required"`
	DriverID  uuid.UUID `json:"driver_id" validate:"required"`
	Latitude  float64   `json:"latitude" validate:"required,min=-90,max=90"`
	Longitude float64   `json:"longitude" validate:"required,min=-180,max=180"`
	Speed     float64   `json:"speed" validate:"min=0"`
	Heading   float64   `json:"heading" validate:"min=0,max=360"`
	EventType EventType `json:"event_type" validate:"required,oneof=location geofence speed_alert job_start job_end stop"`
}

// CurrentLocationResponse represents current location response
type CurrentLocationResponse struct {
	DriverID  uuid.UUID `json:"driver_id"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Speed     float64   `json:"speed"`
	Heading   float64   `json:"heading"`
	Timestamp time.Time `json:"timestamp"`
	EventType EventType `json:"event_type"`
}

// Stop represents a detected stop of 5+ minutes
type Stop struct {
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	StartTime time.Time `json:"start_time"`
	Duration  int       `json:"duration_minutes"`
}