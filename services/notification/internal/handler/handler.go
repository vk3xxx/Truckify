package handler

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"truckify/services/notification/internal/model"
	"truckify/services/notification/internal/service"
	ws "truckify/services/notification/internal/websocket"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Handler struct {
	service   *service.Service
	validator *validator.Validator
	hub       *ws.Hub
}

func New(svc *service.Service, hub *ws.Hub) *Handler {
	return &Handler{service: svc, validator: validator.New(), hub: hub}
}

func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/notifications/send", h.SendNotification).Methods(http.MethodPost)
	router.HandleFunc("/notifications/user/{id}", h.GetUserNotifications).Methods(http.MethodGet)
	router.HandleFunc("/ws", h.HandleWebSocket)
	// Messaging
	router.HandleFunc("/messages/conversations", h.GetConversations).Methods(http.MethodGet)
	router.HandleFunc("/messages/conversations/job/{jobId}", h.GetOrCreateConversation).Methods(http.MethodPost)
	router.HandleFunc("/messages/conversations/{id}", h.GetMessages).Methods(http.MethodGet)
	router.HandleFunc("/messages/conversations/{id}", h.SendMessage).Methods(http.MethodPost)
}

func (h *Handler) SendNotification(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	var req model.SendNotificationRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}
	n, err := h.service.SendNotification(req)
	if err != nil {
		response.InternalServerError(w, "Failed to send notification", "", reqID)
		return
	}
	// Push via WebSocket
	h.hub.SendToUser(req.UserID, "notification", n)
	response.Created(w, n, reqID)
}

func (h *Handler) GetUserNotifications(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid user ID", "", reqID)
		return
	}
	notifications := h.service.GetUserNotifications(userID)
	if notifications == nil {
		notifications = []model.Notification{}
	}
	response.Success(w, notifications, reqID)
}

func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		http.Error(w, "invalid user_id", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &ws.Client{UserID: uid, Conn: conn, Send: make(chan []byte, 256)}
	h.hub.Register(client)

	go h.writePump(client)
	go h.readPump(client)
}

func (h *Handler) writePump(c *ws.Client) {
	defer func() {
		c.Conn.Close()
	}()
	for msg := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}

func (h *Handler) readPump(c *ws.Client) {
	defer func() {
		h.hub.Unregister(c)
		c.Conn.Close()
	}()
	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (h *Handler) GetHub() *ws.Hub {
	return h.hub
}

func (h *Handler) getUserID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.Header.Get("X-User-ID"))
}

func (h *Handler) GetConversations(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}
	convs, err := h.service.GetUserConversations(userID)
	if err != nil {
		response.InternalServerError(w, "Failed to get conversations", "", reqID)
		return
	}
	if convs == nil {
		convs = []model.Conversation{}
	}
	response.Success(w, convs, reqID)
}

func (h *Handler) GetOrCreateConversation(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}
	jobID, err := uuid.Parse(mux.Vars(r)["jobId"])
	if err != nil {
		response.BadRequest(w, "Invalid job ID", "", reqID)
		return
	}

	var req struct {
		ShipperID string `json:"shipper_id"`
		DriverID  string `json:"driver_id"`
	}
	h.validator.DecodeAndValidate(r, &req)

	shipperID, _ := uuid.Parse(req.ShipperID)
	driverID, _ := uuid.Parse(req.DriverID)

	// Verify user is part of conversation
	if userID != shipperID && userID != driverID {
		response.Forbidden(w, "Not authorized", "", reqID)
		return
	}

	conv, err := h.service.GetOrCreateConversation(jobID, shipperID, driverID)
	if err != nil {
		response.InternalServerError(w, "Failed to create conversation", "", reqID)
		return
	}
	response.Success(w, conv, reqID)
}

func (h *Handler) GetMessages(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}
	convID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid conversation ID", "", reqID)
		return
	}

	// Verify user is part of conversation
	conv, _ := h.service.GetConversation(convID)
	if conv == nil || (userID != conv.ShipperID && userID != conv.DriverID) {
		response.Forbidden(w, "Not authorized", "", reqID)
		return
	}

	msgs, err := h.service.GetMessages(convID, userID)
	if err != nil {
		response.InternalServerError(w, "Failed to get messages", "", reqID)
		return
	}
	if msgs == nil {
		msgs = []model.Message{}
	}
	response.Success(w, msgs, reqID)
}

func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
	reqID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "unauthorized", "", reqID)
		return
	}
	convID, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid conversation ID", "", reqID)
		return
	}

	var req struct {
		Content string `json:"content" validate:"required,max=2000"`
	}
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), reqID)
		return
	}

	// Verify user is part of conversation
	conv, _ := h.service.GetConversation(convID)
	if conv == nil || (userID != conv.ShipperID && userID != conv.DriverID) {
		response.Forbidden(w, "Not authorized", "", reqID)
		return
	}

	msg, err := h.service.SendMessage(convID, userID, req.Content)
	if err != nil {
		response.InternalServerError(w, "Failed to send message", "", reqID)
		return
	}

	// Push to other user via WebSocket
	recipientID := conv.ShipperID
	if userID == conv.ShipperID {
		recipientID = conv.DriverID
	}
	h.hub.SendToUser(recipientID, "message", msg)

	response.Created(w, msg, reqID)
}
