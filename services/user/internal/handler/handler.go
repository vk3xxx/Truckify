package handler

import (
	"context"
	"encoding/base64"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"truckify/services/user/internal/model"
	"truckify/services/user/internal/service"
	"truckify/shared/pkg/logger"
	"truckify/shared/pkg/response"
	"truckify/shared/pkg/validator"
)

type ServiceInterface interface {
	CreateProfile(ctx context.Context, userID uuid.UUID, req *model.CreateProfileRequest) (*model.UserProfile, error)
	GetProfile(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, req *model.UpdateProfileRequest) (*model.UserProfile, error)
	DeleteProfile(ctx context.Context, userID uuid.UUID) error
	CreateDocument(ctx context.Context, doc *model.Document) error
	GetUserDocuments(ctx context.Context, userID uuid.UUID) ([]model.Document, error)
	GetJobDocuments(ctx context.Context, jobID uuid.UUID) ([]model.Document, error)
	GetDocument(ctx context.Context, id uuid.UUID) (*model.Document, error)
	DeleteDocument(ctx context.Context, id, userID uuid.UUID) error
	VerifyDocument(ctx context.Context, id uuid.UUID, status string) error
}

type Handler struct {
	service   ServiceInterface
	validator *validator.Validator
	logger    *logger.Logger
}

func New(service ServiceInterface, logger *logger.Logger) *Handler {
	return &Handler{service: service, validator: validator.New(), logger: logger}
}

func (h *Handler) RegisterRoutes(router *mux.Router) {
	router.HandleFunc("/profile", h.CreateProfile).Methods(http.MethodPost)
	router.HandleFunc("/profile", h.GetProfile).Methods(http.MethodGet)
	router.HandleFunc("/profile", h.UpdateProfile).Methods(http.MethodPut)
	router.HandleFunc("/profile", h.DeleteProfile).Methods(http.MethodDelete)
	router.HandleFunc("/documents", h.UploadDocument).Methods(http.MethodPost)
	router.HandleFunc("/documents", h.GetMyDocuments).Methods(http.MethodGet)
	router.HandleFunc("/documents/job/{jobId}", h.GetJobDocuments).Methods(http.MethodGet)
	router.HandleFunc("/documents/{id}", h.GetDocument).Methods(http.MethodGet)
	router.HandleFunc("/documents/{id}", h.DeleteDocument).Methods(http.MethodDelete)
	router.HandleFunc("/documents/{id}/verify", h.VerifyDocument).Methods(http.MethodPost)
	router.HandleFunc("/health", h.Health).Methods(http.MethodGet)
}

func (h *Handler) getUserID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(r.Header.Get("X-User-ID"))
}

func (h *Handler) CreateProfile(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	var req model.CreateProfileRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	profile, err := h.service.CreateProfile(r.Context(), userID, &req)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Created(w, profile, requestID)
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	profile, err := h.service.GetProfile(r.Context(), userID)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, profile, requestID)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	var req model.UpdateProfileRequest
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	profile, err := h.service.UpdateProfile(r.Context(), userID, &req)
	if err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, profile, requestID)
}

func (h *Handler) DeleteProfile(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)

	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	if err := h.service.DeleteProfile(r.Context(), userID); err != nil {
		h.handleError(w, err, requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Profile deleted"}, requestID)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	response.Success(w, map[string]interface{}{"status": "healthy", "service": "user-service"}, requestID)
}

func (h *Handler) handleError(w http.ResponseWriter, err error, requestID string) {
	switch err {
	case service.ErrProfileNotFound:
		response.NotFound(w, "Profile not found", "", requestID)
	case service.ErrProfileExists:
		response.Conflict(w, "Profile already exists", "", requestID)
	default:
		h.logger.Error("Internal error", "error", err)
		response.InternalServerError(w, "Internal server error", "", requestID)
	}
}

// Exported errors for testing
var (
	ErrProfileNotFound = service.ErrProfileNotFound
	ErrProfileExists   = service.ErrProfileExists
)

// Document handlers
func (h *Handler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	r.ParseMultipartForm(10 << 20) // 10MB max
	file, header, err := r.FormFile("file")
	if err != nil {
		response.BadRequest(w, "No file provided", "", requestID)
		return
	}
	defer file.Close()

	docType := r.FormValue("doc_type")
	if docType == "" {
		response.BadRequest(w, "doc_type required", "", requestID)
		return
	}

	// Create upload directory
	uploadDir := filepath.Join("uploads", userID.String())
	os.MkdirAll(uploadDir, 0755)

	// Save file
	filename := uuid.New().String() + filepath.Ext(header.Filename)
	filePath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(filePath)
	if err != nil {
		response.InternalServerError(w, "Failed to save file", "", requestID)
		return
	}
	defer dst.Close()
	io.Copy(dst, file)

	// Parse optional fields
	var jobID *uuid.UUID
	if jid := r.FormValue("job_id"); jid != "" {
		if parsed, err := uuid.Parse(jid); err == nil {
			jobID = &parsed
		}
	}
	var expiresAt *time.Time
	if exp := r.FormValue("expires_at"); exp != "" {
		if t, err := time.Parse("2006-01-02", exp); err == nil {
			expiresAt = &t
		}
	}
	notes := r.FormValue("notes")
	var notesPtr *string
	if notes != "" {
		notesPtr = &notes
	}

	doc := &model.Document{
		UserID:    userID,
		JobID:     jobID,
		DocType:   docType,
		Filename:  header.Filename,
		FilePath:  filePath,
		FileSize:  int(header.Size),
		MimeType:  header.Header.Get("Content-Type"),
		ExpiresAt: expiresAt,
		Notes:     notesPtr,
	}

	if err := h.service.CreateDocument(r.Context(), doc); err != nil {
		response.InternalServerError(w, "Failed to save document", "", requestID)
		return
	}

	response.Created(w, doc, requestID)
}

func (h *Handler) GetMyDocuments(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	docs, err := h.service.GetUserDocuments(r.Context(), userID)
	if err != nil {
		response.InternalServerError(w, "Failed to get documents", "", requestID)
		return
	}
	if docs == nil {
		docs = []model.Document{}
	}
	response.Success(w, docs, requestID)
}

func (h *Handler) GetJobDocuments(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	jobID, err := uuid.Parse(mux.Vars(r)["jobId"])
	if err != nil {
		response.BadRequest(w, "Invalid job ID", "", requestID)
		return
	}

	docs, err := h.service.GetJobDocuments(r.Context(), jobID)
	if err != nil {
		response.InternalServerError(w, "Failed to get documents", "", requestID)
		return
	}
	if docs == nil {
		docs = []model.Document{}
	}
	response.Success(w, docs, requestID)
}

func (h *Handler) GetDocument(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid document ID", "", requestID)
		return
	}

	doc, err := h.service.GetDocument(r.Context(), id)
	if err != nil || doc == nil {
		response.NotFound(w, "Document not found", "", requestID)
		return
	}

	// If download requested, return file content
	if r.URL.Query().Get("download") == "true" {
		data, err := os.ReadFile(doc.FilePath)
		if err != nil {
			response.NotFound(w, "File not found", "", requestID)
			return
		}
		response.Success(w, map[string]interface{}{
			"document": doc,
			"content":  base64.StdEncoding.EncodeToString(data),
		}, requestID)
		return
	}

	response.Success(w, doc, requestID)
}

func (h *Handler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	userID, err := h.getUserID(r)
	if err != nil {
		response.Unauthorized(w, "User not authenticated", "", requestID)
		return
	}

	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid document ID", "", requestID)
		return
	}

	if err := h.service.DeleteDocument(r.Context(), id, userID); err != nil {
		response.NotFound(w, "Document not found", "", requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Document deleted"}, requestID)
}

func (h *Handler) VerifyDocument(w http.ResponseWriter, r *http.Request) {
	requestID, _ := r.Context().Value("request_id").(string)
	
	// Check admin role
	userType := r.Header.Get("X-User-Type")
	if userType != "admin" {
		response.Forbidden(w, "Admin access required", "", requestID)
		return
	}

	id, err := uuid.Parse(mux.Vars(r)["id"])
	if err != nil {
		response.BadRequest(w, "Invalid document ID", "", requestID)
		return
	}

	var req struct {
		Status string `json:"status" validate:"required,oneof=verified rejected"`
	}
	if err := h.validator.DecodeAndValidate(r, &req); err != nil {
		response.BadRequest(w, "Invalid request", err.Error(), requestID)
		return
	}

	if err := h.service.VerifyDocument(r.Context(), id, req.Status); err != nil {
		response.InternalServerError(w, "Failed to update document", "", requestID)
		return
	}

	response.Success(w, map[string]string{"message": "Document " + req.Status}, requestID)
}
