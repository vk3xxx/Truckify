package model

import (
	"time"

	"github.com/google/uuid"
)

type UserProfile struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	FirstName   string     `json:"first_name"`
	LastName    string     `json:"last_name"`
	Phone       *string    `json:"phone,omitempty"`
	AvatarURL   *string    `json:"avatar_url,omitempty"`
	Address     *Address   `json:"address,omitempty"`
	Preferences *string    `json:"preferences,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type Address struct {
	Street     string  `json:"street"`
	City       string  `json:"city"`
	State      string  `json:"state"`
	PostalCode string  `json:"postal_code"`
	Country    string  `json:"country"`
	Lat        float64 `json:"lat,omitempty"`
	Lng        float64 `json:"lng,omitempty"`
}

type CreateProfileRequest struct {
	FirstName string   `json:"first_name" validate:"required,min=1,max=100"`
	LastName  string   `json:"last_name" validate:"required,min=1,max=100"`
	Phone     *string  `json:"phone" validate:"omitempty,e164"`
	Address   *Address `json:"address"`
}

type UpdateProfileRequest struct {
	FirstName *string  `json:"first_name" validate:"omitempty,min=1,max=100"`
	LastName  *string  `json:"last_name" validate:"omitempty,min=1,max=100"`
	Phone     *string  `json:"phone" validate:"omitempty,e164"`
	AvatarURL *string  `json:"avatar_url" validate:"omitempty,url"`
	Address   *Address `json:"address"`
}


// Document types
type Document struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	UserID    uuid.UUID  `json:"user_id" db:"user_id"`
	JobID     *uuid.UUID `json:"job_id,omitempty" db:"job_id"`
	DocType   string     `json:"doc_type" db:"doc_type"`
	Filename  string     `json:"filename" db:"filename"`
	FilePath  string     `json:"file_path" db:"file_path"`
	FileSize  int        `json:"file_size" db:"file_size"`
	MimeType  string     `json:"mime_type" db:"mime_type"`
	Status    string     `json:"status" db:"status"`
	ExpiresAt *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	Notes     *string    `json:"notes,omitempty" db:"notes"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

type UploadDocumentRequest struct {
	DocType   string  `json:"doc_type" validate:"required,oneof=license insurance rego pod invoice other"`
	JobID     *string `json:"job_id"`
	ExpiresAt *string `json:"expires_at"`
	Notes     *string `json:"notes"`
}
