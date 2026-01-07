package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"truckify/services/notification/internal/model"
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// Notification methods
func (r *Repository) CreateNotification(ctx context.Context, n *model.Notification) error {
	query := `
		INSERT INTO notifications (id, user_id, type, title, message, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := r.db.ExecContext(ctx, query, n.ID, n.UserID, n.Type, n.Title, n.Message, n.Status, n.CreatedAt)
	return err
}

func (r *Repository) GetUserNotifications(ctx context.Context, userID uuid.UUID, limit int) ([]model.Notification, error) {
	query := `
		SELECT id, user_id, type, title, message, status, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	rows, err := r.db.QueryContext(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []model.Notification
	for rows.Next() {
		var n model.Notification
		err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &n.Status, &n.CreatedAt)
		if err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	return notifications, nil
}

func (r *Repository) MarkNotificationAsRead(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE notifications SET status = 'read' WHERE id = $1`
	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// Conversation methods
func (r *Repository) CreateConversation(ctx context.Context, conv *model.Conversation) error {
	query := `
		INSERT INTO conversations (id, job_id, shipper_id, driver_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query, conv.ID, conv.JobID, conv.ShipperID, conv.DriverID, conv.CreatedAt, conv.UpdatedAt)
	return err
}

func (r *Repository) GetConversationByID(ctx context.Context, id uuid.UUID) (*model.Conversation, error) {
	query := `SELECT id, job_id, shipper_id, driver_id, created_at, updated_at FROM conversations WHERE id = $1`
	var c model.Conversation
	err := r.db.QueryRowContext(ctx, query, id).Scan(&c.ID, &c.JobID, &c.ShipperID, &c.DriverID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (r *Repository) GetConversationByJobID(ctx context.Context, jobID uuid.UUID) (*model.Conversation, error) {
	query := `SELECT id, job_id, shipper_id, driver_id, created_at, updated_at FROM conversations WHERE job_id = $1`
	var c model.Conversation
	err := r.db.QueryRowContext(ctx, query, jobID).Scan(&c.ID, &c.JobID, &c.ShipperID, &c.DriverID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (r *Repository) GetUserConversations(ctx context.Context, userID uuid.UUID) ([]model.Conversation, error) {
	query := `
		SELECT id, job_id, shipper_id, driver_id, created_at, updated_at
		FROM conversations
		WHERE shipper_id = $1 OR driver_id = $1
		ORDER BY updated_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var convs []model.Conversation
	for rows.Next() {
		var c model.Conversation
		if err := rows.Scan(&c.ID, &c.JobID, &c.ShipperID, &c.DriverID, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		convs = append(convs, c)
	}
	return convs, nil
}

func (r *Repository) UpdateConversationTimestamp(ctx context.Context, id uuid.UUID, timestamp time.Time) error {
	query := `UPDATE conversations SET updated_at = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, timestamp, id)
	return err
}

// Message methods
func (r *Repository) CreateMessage(ctx context.Context, msg *model.Message) error {
	query := `
		INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err := r.db.ExecContext(ctx, query, msg.ID, msg.ConversationID, msg.SenderID, msg.Content, msg.CreatedAt)
	return err
}

func (r *Repository) GetMessages(ctx context.Context, conversationID uuid.UUID) ([]model.Message, error) {
	query := `
		SELECT id, conversation_id, sender_id, content, read_at, created_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.QueryContext(ctx, query, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []model.Message
	for rows.Next() {
		var m model.Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Content, &m.ReadAt, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (r *Repository) GetLastMessage(ctx context.Context, conversationID uuid.UUID) (*model.Message, error) {
	query := `
		SELECT id, conversation_id, sender_id, content, read_at, created_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`
	var msg model.Message
	err := r.db.QueryRowContext(ctx, query, conversationID).Scan(&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.Content, &msg.ReadAt, &msg.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &msg, err
}

func (r *Repository) GetUnreadCount(ctx context.Context, conversationID, userID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM messages
		WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL
	`
	var count int
	err := r.db.QueryRowContext(ctx, query, conversationID, userID).Scan(&count)
	return count, err
}

func (r *Repository) MarkMessagesAsRead(ctx context.Context, conversationID, userID uuid.UUID, timestamp time.Time) error {
	query := `
		UPDATE messages
		SET read_at = $1
		WHERE conversation_id = $2 AND sender_id != $3 AND read_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, timestamp, conversationID, userID)
	return err
}
