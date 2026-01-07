package websocket

import (
	"encoding/json"
	"sync"

	"github.com/google/uuid"
)

// ChatMessage represents an encrypted chat message
type ChatMessage struct {
	ID        string           `json:"id"`
	ChatID    string           `json:"chatId"`
	SenderID  string           `json:"senderId"`
	Encrypted bool             `json:"encrypted"`
	Payload   *EncryptedPayload `json:"encryptedPayload,omitempty"`
	Content   string           `json:"content,omitempty"`
	Timestamp string           `json:"timestamp"`
}

// EncryptedPayload contains the E2E encrypted message data
type EncryptedPayload struct {
	Ciphertext string     `json:"ciphertext"`
	IV         string     `json:"iv"`
	SessionKey SessionKey `json:"sessionKey"`
}

// SessionKey contains wrapped keys for 3-way decryption
type SessionKey struct {
	ForSender    string `json:"forSender"`
	ForRecipient string `json:"forRecipient"`
	ForAdmin     string `json:"forAdmin"`
}

// PublicKeyStore stores user public keys for E2E encryption
type PublicKeyStore struct {
	keys map[uuid.UUID]string
	mu   sync.RWMutex
}

func NewPublicKeyStore() *PublicKeyStore {
	return &PublicKeyStore{
		keys: make(map[uuid.UUID]string),
	}
}

func (s *PublicKeyStore) Set(userID uuid.UUID, publicKey string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.keys[userID] = publicKey
}

func (s *PublicKeyStore) Get(userID uuid.UUID) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	key, ok := s.keys[userID]
	return key, ok
}

func (s *PublicKeyStore) Delete(userID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.keys, userID)
}

// ChatHub extends Hub with chat-specific functionality
type ChatHub struct {
	*Hub
	publicKeys *PublicKeyStore
	chatRooms  map[string]map[uuid.UUID]bool // chatID -> userIDs
	roomMu     sync.RWMutex
}

func NewChatHub() *ChatHub {
	return &ChatHub{
		Hub:        NewHub(),
		publicKeys: NewPublicKeyStore(),
		chatRooms:  make(map[string]map[uuid.UUID]bool),
	}
}

// HandlePublicKey stores a user's public key and broadcasts to chat participants
func (h *ChatHub) HandlePublicKey(userID uuid.UUID, publicKey string) {
	h.publicKeys.Set(userID, publicKey)

	// Notify all users in shared chats about the new public key
	h.roomMu.RLock()
	notified := make(map[uuid.UUID]bool)
	for _, users := range h.chatRooms {
		if users[userID] {
			for otherUserID := range users {
				if otherUserID != userID && !notified[otherUserID] {
					h.SendToUser(otherUserID, "public_key", map[string]string{
						"userId":    userID.String(),
						"publicKey": publicKey,
					})
					notified[otherUserID] = true
				}
			}
		}
	}
	h.roomMu.RUnlock()
}

// GetPublicKey retrieves a user's public key
func (h *ChatHub) GetPublicKey(userID uuid.UUID) (string, bool) {
	return h.publicKeys.Get(userID)
}

// JoinChat adds a user to a chat room
func (h *ChatHub) JoinChat(chatID string, userID uuid.UUID) {
	h.roomMu.Lock()
	defer h.roomMu.Unlock()

	if h.chatRooms[chatID] == nil {
		h.chatRooms[chatID] = make(map[uuid.UUID]bool)
	}
	h.chatRooms[chatID][userID] = true

	// Send existing public keys to the joining user
	for otherUserID := range h.chatRooms[chatID] {
		if otherUserID != userID {
			if key, ok := h.publicKeys.Get(otherUserID); ok {
				h.SendToUser(userID, "public_key", map[string]string{
					"userId":    otherUserID.String(),
					"publicKey": key,
				})
			}
		}
	}
}

// LeaveChat removes a user from a chat room
func (h *ChatHub) LeaveChat(chatID string, userID uuid.UUID) {
	h.roomMu.Lock()
	defer h.roomMu.Unlock()

	if users, ok := h.chatRooms[chatID]; ok {
		delete(users, userID)
		if len(users) == 0 {
			delete(h.chatRooms, chatID)
		}
	}
}

// SendChatMessage sends a message to all participants in a chat
func (h *ChatHub) SendChatMessage(chatID string, msg *ChatMessage) {
	h.roomMu.RLock()
	users := h.chatRooms[chatID]
	h.roomMu.RUnlock()

	data, _ := json.Marshal(Message{Type: "message", Payload: msg})
	for userID := range users {
		h.broadcast <- &BroadcastMessage{UserID: userID, Message: data}
	}
}

// SendTypingIndicator notifies chat participants of typing status
func (h *ChatHub) SendTypingIndicator(chatID string, senderID uuid.UUID, isTyping bool) {
	h.roomMu.RLock()
	users := h.chatRooms[chatID]
	h.roomMu.RUnlock()

	for userID := range users {
		if userID != senderID {
			h.SendToUser(userID, "typing", map[string]interface{}{
				"chatId":   chatID,
				"userId":   senderID.String(),
				"isTyping": isTyping,
			})
		}
	}
}
