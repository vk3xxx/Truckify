package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"truckify/services/user/internal/model"
)

var (
	ErrProfileNotFound = errors.New("profile not found")
	ErrProfileExists   = errors.New("profile already exists")
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateProfile(ctx context.Context, profile *model.UserProfile) error {
	var addressJSON interface{} = nil
	if profile.Address != nil {
		bytes, err := json.Marshal(profile.Address)
		if err != nil {
			return err
		}
		addressJSON = bytes
	}

	query := `
		INSERT INTO user_profiles (id, user_id, first_name, last_name, phone, avatar_url, address, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.ExecContext(ctx, query,
		profile.ID, profile.UserID, profile.FirstName, profile.LastName,
		profile.Phone, profile.AvatarURL, addressJSON, profile.CreatedAt, profile.UpdatedAt,
	)
	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "user_profiles_user_id_key"` {
			return ErrProfileExists
		}
		return err
	}
	return nil
}

func (r *Repository) GetProfileByUserID(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error) {
	query := `
		SELECT id, user_id, first_name, last_name, phone, avatar_url, address, created_at, updated_at
		FROM user_profiles WHERE user_id = $1
	`
	profile := &model.UserProfile{}
	var addressJSON []byte

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&profile.ID, &profile.UserID, &profile.FirstName, &profile.LastName,
		&profile.Phone, &profile.AvatarURL, &addressJSON, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrProfileNotFound
	}
	if err != nil {
		return nil, err
	}

	if addressJSON != nil {
		profile.Address = &model.Address{}
		json.Unmarshal(addressJSON, profile.Address)
	}
	return profile, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, userID uuid.UUID, req *model.UpdateProfileRequest) (*model.UserProfile, error) {
	var addressJSON interface{} = nil
	if req.Address != nil {
		bytes, err := json.Marshal(req.Address)
		if err != nil {
			return nil, err
		}
		addressJSON = bytes
	}

	query := `
		UPDATE user_profiles SET
			first_name = COALESCE($1, first_name),
			last_name = COALESCE($2, last_name),
			phone = COALESCE($3, phone),
			avatar_url = COALESCE($4, avatar_url),
			address = COALESCE($5, address),
			updated_at = $6
		WHERE user_id = $7
		RETURNING id, user_id, first_name, last_name, phone, avatar_url, address, created_at, updated_at
	`

	profile := &model.UserProfile{}
	var retAddressJSON []byte
	err := r.db.QueryRowContext(ctx, query,
		req.FirstName, req.LastName, req.Phone, req.AvatarURL, addressJSON, time.Now(), userID,
	).Scan(
		&profile.ID, &profile.UserID, &profile.FirstName, &profile.LastName,
		&profile.Phone, &profile.AvatarURL, &retAddressJSON, &profile.CreatedAt, &profile.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrProfileNotFound
	}
	if err != nil {
		return nil, err
	}

	if retAddressJSON != nil {
		profile.Address = &model.Address{}
		json.Unmarshal(retAddressJSON, profile.Address)
	}
	return profile, nil
}

func (r *Repository) DeleteProfile(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM user_profiles WHERE user_id = $1`
	result, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrProfileNotFound
	}
	return nil
}


// Document methods
func (r *Repository) CreateDocument(ctx context.Context, doc *model.Document) error {
	query := `INSERT INTO documents (id, user_id, job_id, doc_type, filename, file_path, file_size, mime_type, status, expires_at, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`
	_, err := r.db.ExecContext(ctx, query, doc.ID, doc.UserID, doc.JobID, doc.DocType, doc.Filename, doc.FilePath, doc.FileSize, doc.MimeType, doc.Status, doc.ExpiresAt, doc.Notes, doc.CreatedAt, doc.UpdatedAt)
	return err
}

func (r *Repository) GetDocumentsByUser(ctx context.Context, userID uuid.UUID) ([]model.Document, error) {
	query := `SELECT id, user_id, job_id, doc_type, filename, file_path, file_size, mime_type, status, expires_at, notes, created_at, updated_at FROM documents WHERE user_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []model.Document
	for rows.Next() {
		var d model.Document
		if err := rows.Scan(&d.ID, &d.UserID, &d.JobID, &d.DocType, &d.Filename, &d.FilePath, &d.FileSize, &d.MimeType, &d.Status, &d.ExpiresAt, &d.Notes, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (r *Repository) GetDocumentsByJob(ctx context.Context, jobID uuid.UUID) ([]model.Document, error) {
	query := `SELECT id, user_id, job_id, doc_type, filename, file_path, file_size, mime_type, status, expires_at, notes, created_at, updated_at FROM documents WHERE job_id = $1 ORDER BY created_at DESC`
	rows, err := r.db.QueryContext(ctx, query, jobID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []model.Document
	for rows.Next() {
		var d model.Document
		if err := rows.Scan(&d.ID, &d.UserID, &d.JobID, &d.DocType, &d.Filename, &d.FilePath, &d.FileSize, &d.MimeType, &d.Status, &d.ExpiresAt, &d.Notes, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		docs = append(docs, d)
	}
	return docs, nil
}

func (r *Repository) GetDocument(ctx context.Context, id uuid.UUID) (*model.Document, error) {
	query := `SELECT id, user_id, job_id, doc_type, filename, file_path, file_size, mime_type, status, expires_at, notes, created_at, updated_at FROM documents WHERE id = $1`
	var d model.Document
	err := r.db.QueryRowContext(ctx, query, id).Scan(&d.ID, &d.UserID, &d.JobID, &d.DocType, &d.Filename, &d.FilePath, &d.FileSize, &d.MimeType, &d.Status, &d.ExpiresAt, &d.Notes, &d.CreatedAt, &d.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &d, err
}

func (r *Repository) DeleteDocument(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM documents WHERE id = $1`, id)
	return err
}

func (r *Repository) UpdateDocumentStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE documents SET status = $1, updated_at = $2 WHERE id = $3`, status, time.Now(), id)
	return err
}
