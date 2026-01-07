package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"truckify/services/notification/internal/model"
	"truckify/shared/pkg/logger"
)

type RepositoryInterface interface {
	CreateNotification(ctx context.Context, n *model.Notification) error
	GetUserNotifications(ctx context.Context, userID uuid.UUID, limit int) ([]model.Notification, error)
	MarkNotificationAsRead(ctx context.Context, id uuid.UUID) error
	CreateConversation(ctx context.Context, conv *model.Conversation) error
	GetConversationByID(ctx context.Context, id uuid.UUID) (*model.Conversation, error)
	GetConversationByJobID(ctx context.Context, jobID uuid.UUID) (*model.Conversation, error)
	GetUserConversations(ctx context.Context, userID uuid.UUID) ([]model.Conversation, error)
	UpdateConversationTimestamp(ctx context.Context, id uuid.UUID, timestamp time.Time) error
	CreateMessage(ctx context.Context, msg *model.Message) error
	GetMessages(ctx context.Context, conversationID uuid.UUID) ([]model.Message, error)
	GetLastMessage(ctx context.Context, conversationID uuid.UUID) (*model.Message, error)
	GetUnreadCount(ctx context.Context, conversationID, userID uuid.UUID) (int, error)
	MarkMessagesAsRead(ctx context.Context, conversationID, userID uuid.UUID, timestamp time.Time) error
}

type Service struct {
	repo RepositoryInterface
	log  *logger.Logger
}

func New(log *logger.Logger, repo RepositoryInterface) *Service {
	return &Service{
		repo: repo,
		log:  log,
	}
}

func (s *Service) SendNotification(req model.SendNotificationRequest) (*model.Notification, error) {
	n := &model.Notification{
		ID:        uuid.New(),
		UserID:    req.UserID,
		Type:      req.Type,
		Title:     req.Title,
		Message:   req.Message,
		Status:    "unread",
		CreatedAt: time.Now(),
	}

	if err := s.repo.CreateNotification(context.Background(), n); err != nil {
		s.log.Error("Failed to create notification", "error", err, "user_id", n.UserID)
		return nil, err
	}

	s.log.Info("Notification sent", "type", n.Type, "user_id", n.UserID, "title", n.Title)
	return n, nil
}

func (s *Service) GetUserNotifications(userID uuid.UUID) []model.Notification {
	notifications, err := s.repo.GetUserNotifications(context.Background(), userID, 50)
	if err != nil {
		s.log.Error("Failed to get notifications", "error", err, "user_id", userID)
		return []model.Notification{}
	}
	return notifications
}

// Messaging methods
func (s *Service) GetOrCreateConversation(jobID, shipperID, driverID uuid.UUID) (*model.Conversation, error) {
	ctx := context.Background()
	conv, err := s.repo.GetConversationByJobID(ctx, jobID)
	if err != nil {
		return nil, err
	}

	if conv == nil {
		conv = &model.Conversation{
			ID:        uuid.New(),
			JobID:     jobID,
			ShipperID: shipperID,
			DriverID:  driverID,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := s.repo.CreateConversation(ctx, conv); err != nil {
			return nil, err
		}
	}

	return conv, nil
}

func (s *Service) GetUserConversations(userID uuid.UUID) ([]model.Conversation, error) {
	ctx := context.Background()
	convs, err := s.repo.GetUserConversations(ctx, userID)
	if err != nil {
		return nil, err
	}

	for i := range convs {
		// Get last message
		msg, err := s.repo.GetLastMessage(ctx, convs[i].ID)
		if err == nil && msg != nil {
			convs[i].LastMessage = msg
		}

		// Get unread count
		count, err := s.repo.GetUnreadCount(ctx, convs[i].ID, userID)
		if err == nil {
			convs[i].UnreadCount = count
		}
	}

	return convs, nil
}

func (s *Service) GetMessages(conversationID, userID uuid.UUID) ([]model.Message, error) {
	ctx := context.Background()

	// Mark messages as read
	if err := s.repo.MarkMessagesAsRead(ctx, conversationID, userID, time.Now()); err != nil {
		s.log.Error("Failed to mark messages as read", "error", err)
	}

	return s.repo.GetMessages(ctx, conversationID)
}

func (s *Service) SendMessage(conversationID, senderID uuid.UUID, content string) (*model.Message, error) {
	ctx := context.Background()

	msg := &model.Message{
		ID:             uuid.New(),
		ConversationID: conversationID,
		SenderID:       senderID,
		Content:        content,
		CreatedAt:      time.Now(),
	}

	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		return nil, err
	}

	// Update conversation timestamp
	if err := s.repo.UpdateConversationTimestamp(ctx, conversationID, time.Now()); err != nil {
		s.log.Error("Failed to update conversation timestamp", "error", err)
	}

	return msg, nil
}

func (s *Service) GetConversation(id uuid.UUID) (*model.Conversation, error) {
	return s.repo.GetConversationByID(context.Background(), id)
}

func (s *Service) GetConversationByJob(jobID uuid.UUID) (*model.Conversation, error) {
	return s.repo.GetConversationByJobID(context.Background(), jobID)
}
