package service

import (
	"database/sql"
	"sync"
	"time"

	"github.com/google/uuid"
	"truckify/services/notification/internal/model"
	"truckify/shared/pkg/logger"
)

type Service struct {
	notifications map[uuid.UUID][]model.Notification
	mu            sync.RWMutex
	log           *logger.Logger
	db            *sql.DB
}

func New(log *logger.Logger, db *sql.DB) *Service {
	return &Service{
		notifications: make(map[uuid.UUID][]model.Notification),
		log:           log,
		db:            db,
	}
}

func (s *Service) SendNotification(req model.SendNotificationRequest) (*model.Notification, error) {
	n := &model.Notification{
		ID:        uuid.New(),
		UserID:    req.UserID,
		Type:      req.Type,
		Title:     req.Title,
		Message:   req.Message,
		Status:    "sent",
		CreatedAt: time.Now(),
	}

	s.log.Info("Notification sent", "type", n.Type, "user_id", n.UserID, "title", n.Title)

	s.mu.Lock()
	s.notifications[req.UserID] = append(s.notifications[req.UserID], *n)
	s.mu.Unlock()

	return n, nil
}

func (s *Service) GetUserNotifications(userID uuid.UUID) []model.Notification {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.notifications[userID]
}

// Messaging methods
func (s *Service) GetOrCreateConversation(jobID, shipperID, driverID uuid.UUID) (*model.Conversation, error) {
	var conv model.Conversation
	err := s.db.QueryRow(`SELECT id, job_id, shipper_id, driver_id, created_at, updated_at FROM conversations WHERE job_id = $1`, jobID).
		Scan(&conv.ID, &conv.JobID, &conv.ShipperID, &conv.DriverID, &conv.CreatedAt, &conv.UpdatedAt)
	if err == sql.ErrNoRows {
		conv = model.Conversation{
			ID:        uuid.New(),
			JobID:     jobID,
			ShipperID: shipperID,
			DriverID:  driverID,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		_, err = s.db.Exec(`INSERT INTO conversations (id, job_id, shipper_id, driver_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
			conv.ID, conv.JobID, conv.ShipperID, conv.DriverID, conv.CreatedAt, conv.UpdatedAt)
		if err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}
	return &conv, nil
}

func (s *Service) GetUserConversations(userID uuid.UUID) ([]model.Conversation, error) {
	rows, err := s.db.Query(`SELECT id, job_id, shipper_id, driver_id, created_at, updated_at FROM conversations WHERE shipper_id = $1 OR driver_id = $1 ORDER BY updated_at DESC`, userID)
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
		// Get last message
		var msg model.Message
		err := s.db.QueryRow(`SELECT id, conversation_id, sender_id, content, read_at, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`, c.ID).
			Scan(&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.Content, &msg.ReadAt, &msg.CreatedAt)
		if err == nil {
			c.LastMessage = &msg
		}
		// Get unread count
		s.db.QueryRow(`SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`, c.ID, userID).Scan(&c.UnreadCount)
		convs = append(convs, c)
	}
	return convs, nil
}

func (s *Service) GetMessages(conversationID, userID uuid.UUID) ([]model.Message, error) {
	// Mark messages as read
	s.db.Exec(`UPDATE messages SET read_at = $1 WHERE conversation_id = $2 AND sender_id != $3 AND read_at IS NULL`, time.Now(), conversationID, userID)

	rows, err := s.db.Query(`SELECT id, conversation_id, sender_id, content, read_at, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, conversationID)
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

func (s *Service) SendMessage(conversationID, senderID uuid.UUID, content string) (*model.Message, error) {
	msg := &model.Message{
		ID:             uuid.New(),
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        content,
		CreatedAt:      time.Now(),
	}
	_, err := s.db.Exec(`INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES ($1, $2, $3, $4, $5)`,
		msg.ID, msg.ConversationID, msg.SenderID, msg.Content, msg.CreatedAt)
	if err != nil {
		return nil, err
	}
	// Update conversation timestamp
	s.db.Exec(`UPDATE conversations SET updated_at = $1 WHERE id = $2`, time.Now(), conversationID)
	return msg, nil
}

func (s *Service) GetConversation(id uuid.UUID) (*model.Conversation, error) {
	var c model.Conversation
	err := s.db.QueryRow(`SELECT id, job_id, shipper_id, driver_id, created_at, updated_at FROM conversations WHERE id = $1`, id).
		Scan(&c.ID, &c.JobID, &c.ShipperID, &c.DriverID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}

func (s *Service) GetConversationByJob(jobID uuid.UUID) (*model.Conversation, error) {
	var c model.Conversation
	err := s.db.QueryRow(`SELECT id, job_id, shipper_id, driver_id, created_at, updated_at FROM conversations WHERE job_id = $1`, jobID).
		Scan(&c.ID, &c.JobID, &c.ShipperID, &c.DriverID, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &c, err
}
