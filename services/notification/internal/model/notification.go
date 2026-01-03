package model

import (
	"time"
	"github.com/google/uuid"
)

type NotificationType string

const (
	TypeEmail NotificationType = "email"
	TypeSMS   NotificationType = "sms"
	TypePush  NotificationType = "push"
)

type Notification struct {
	ID        uuid.UUID        `json:"id"`
	UserID    uuid.UUID        `json:"user_id"`
	Type      NotificationType `json:"type"`
	Title     string           `json:"title"`
	Message   string           `json:"message"`
	Status    string           `json:"status"`
	CreatedAt time.Time        `json:"created_at"`
}

type SendNotificationRequest struct {
	UserID  uuid.UUID        `json:"user_id" validate:"required"`
	Type    NotificationType `json:"type" validate:"required,oneof=email sms push"`
	Title   string           `json:"title" validate:"required,max=200"`
	Message string           `json:"message" validate:"required,max=1000"`
}


// Messaging models
// TODO: Enable end-to-end encryption for messages
// - Implement client-side encryption using Web Crypto API
// - Store encrypted content in database
// - Key exchange during conversation creation
// - Consider Signal Protocol or similar for forward secrecy

type Conversation struct {
	ID        uuid.UUID `json:"id" db:"id"`
	JobID     uuid.UUID `json:"job_id" db:"job_id"`
	ShipperID uuid.UUID `json:"shipper_id" db:"shipper_id"`
	DriverID  uuid.UUID `json:"driver_id" db:"driver_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
	// Enriched fields
	LastMessage   *Message `json:"last_message,omitempty"`
	UnreadCount   int      `json:"unread_count,omitempty"`
}

type Message struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	ConversationID uuid.UUID  `json:"conversation_id" db:"conversation_id"`
	SenderID       uuid.UUID  `json:"sender_id" db:"sender_id"`
	Content        string     `json:"content" db:"content"`
	ReadAt         *time.Time `json:"read_at,omitempty" db:"read_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
}

type SendMessageRequest struct {
	JobID   uuid.UUID `json:"job_id" validate:"required"`
	Content string    `json:"content" validate:"required,max=2000"`
}
