package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"truckify/services/shipper/internal/model"
)

var (
	ErrShipperNotFound = errors.New("shipper not found")
	ErrShipperExists   = errors.New("shipper already exists")
)

type Repository struct {
	db *sql.DB
}

func New(db *sql.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateShipper(ctx context.Context, shipper *model.ShipperProfile) error {
	var addressJSON interface{} = nil
	if shipper.BusinessAddress != nil {
		bytes, err := json.Marshal(shipper.BusinessAddress)
		if err != nil {
			return err
		}
		addressJSON = bytes
	}

	query := `
		INSERT INTO shippers (id, user_id, company_name, abn, tax_id, contact_name, contact_email,
		                      contact_phone, business_address, status, credit_limit, payment_terms,
		                      rating, total_jobs, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	_, err := r.db.ExecContext(ctx, query,
		shipper.ID, shipper.UserID, shipper.CompanyName, shipper.ABN, shipper.TaxID,
		shipper.ContactName, shipper.ContactEmail, shipper.ContactPhone, addressJSON,
		shipper.Status, shipper.CreditLimit, shipper.PaymentTerms, shipper.Rating,
		shipper.TotalJobs, shipper.CreatedAt, shipper.UpdatedAt,
	)
	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "shippers_user_id_key"` {
			return ErrShipperExists
		}
		return err
	}
	return nil
}

func (r *Repository) GetShipperByUserID(ctx context.Context, userID uuid.UUID) (*model.ShipperProfile, error) {
	query := `
		SELECT id, user_id, company_name, abn, tax_id, contact_name, contact_email,
		       contact_phone, business_address, status, credit_limit, payment_terms,
		       rating, total_jobs, created_at, updated_at
		FROM shippers WHERE user_id = $1
	`
	shipper := &model.ShipperProfile{}
	var addressJSON []byte

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&shipper.ID, &shipper.UserID, &shipper.CompanyName, &shipper.ABN, &shipper.TaxID,
		&shipper.ContactName, &shipper.ContactEmail, &shipper.ContactPhone, &addressJSON,
		&shipper.Status, &shipper.CreditLimit, &shipper.PaymentTerms, &shipper.Rating,
		&shipper.TotalJobs, &shipper.CreatedAt, &shipper.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrShipperNotFound
	}
	if err != nil {
		return nil, err
	}

	if addressJSON != nil {
		shipper.BusinessAddress = &model.Address{}
		json.Unmarshal(addressJSON, shipper.BusinessAddress)
	}
	return shipper, nil
}

func (r *Repository) GetShipperByID(ctx context.Context, id uuid.UUID) (*model.ShipperProfile, error) {
	query := `
		SELECT id, user_id, company_name, abn, tax_id, contact_name, contact_email,
		       contact_phone, business_address, status, credit_limit, payment_terms,
		       rating, total_jobs, created_at, updated_at
		FROM shippers WHERE id = $1
	`
	shipper := &model.ShipperProfile{}
	var addressJSON []byte

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&shipper.ID, &shipper.UserID, &shipper.CompanyName, &shipper.ABN, &shipper.TaxID,
		&shipper.ContactName, &shipper.ContactEmail, &shipper.ContactPhone, &addressJSON,
		&shipper.Status, &shipper.CreditLimit, &shipper.PaymentTerms, &shipper.Rating,
		&shipper.TotalJobs, &shipper.CreatedAt, &shipper.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrShipperNotFound
	}
	if err != nil {
		return nil, err
	}

	if addressJSON != nil {
		shipper.BusinessAddress = &model.Address{}
		json.Unmarshal(addressJSON, shipper.BusinessAddress)
	}
	return shipper, nil
}

func (r *Repository) UpdateShipper(ctx context.Context, userID uuid.UUID, req *model.UpdateShipperRequest) (*model.ShipperProfile, error) {
	shipper, err := r.GetShipperByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if req.CompanyName != nil {
		shipper.CompanyName = *req.CompanyName
	}
	if req.ABN != nil {
		shipper.ABN = req.ABN
	}
	if req.TaxID != nil {
		shipper.TaxID = req.TaxID
	}
	if req.ContactName != nil {
		shipper.ContactName = *req.ContactName
	}
	if req.ContactEmail != nil {
		shipper.ContactEmail = *req.ContactEmail
	}
	if req.ContactPhone != nil {
		shipper.ContactPhone = *req.ContactPhone
	}
	if req.BusinessAddress != nil {
		shipper.BusinessAddress = req.BusinessAddress
	}
	if req.CreditLimit != nil {
		shipper.CreditLimit = req.CreditLimit
	}
	if req.PaymentTerms != nil {
		shipper.PaymentTerms = req.PaymentTerms
	}

	var addressJSON interface{} = nil
	if shipper.BusinessAddress != nil {
		bytes, err := json.Marshal(shipper.BusinessAddress)
		if err != nil {
			return nil, err
		}
		addressJSON = bytes
	}

	query := `
		UPDATE shippers
		SET company_name = $1, abn = $2, tax_id = $3, contact_name = $4, contact_email = $5,
		    contact_phone = $6, business_address = $7, credit_limit = $8, payment_terms = $9,
		    updated_at = NOW()
		WHERE user_id = $10
		RETURNING updated_at
	`
	err = r.db.QueryRowContext(ctx, query,
		shipper.CompanyName, shipper.ABN, shipper.TaxID, shipper.ContactName, shipper.ContactEmail,
		shipper.ContactPhone, addressJSON, shipper.CreditLimit, shipper.PaymentTerms, userID,
	).Scan(&shipper.UpdatedAt)

	return shipper, err
}

func (r *Repository) UpdateStatus(ctx context.Context, userID uuid.UUID, status string) error {
	query := `UPDATE shippers SET status = $1, updated_at = NOW() WHERE user_id = $2`
	result, err := r.db.ExecContext(ctx, query, status, userID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrShipperNotFound
	}
	return nil
}

func (r *Repository) DeleteShipper(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM shippers WHERE user_id = $1`
	result, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrShipperNotFound
	}
	return nil
}

func (r *Repository) ListShippers(ctx context.Context, status string, limit, offset int) ([]model.ShipperProfile, error) {
	var query string
	var args []interface{}

	if status != "" {
		query = `
			SELECT id, user_id, company_name, abn, tax_id, contact_name, contact_email,
			       contact_phone, business_address, status, credit_limit, payment_terms,
			       rating, total_jobs, created_at, updated_at
			FROM shippers WHERE status = $1
			ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`
		args = []interface{}{status, limit, offset}
	} else {
		query = `
			SELECT id, user_id, company_name, abn, tax_id, contact_name, contact_email,
			       contact_phone, business_address, status, credit_limit, payment_terms,
			       rating, total_jobs, created_at, updated_at
			FROM shippers
			ORDER BY created_at DESC LIMIT $1 OFFSET $2
		`
		args = []interface{}{limit, offset}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shippers []model.ShipperProfile
	for rows.Next() {
		var shipper model.ShipperProfile
		var addressJSON []byte

		err := rows.Scan(
			&shipper.ID, &shipper.UserID, &shipper.CompanyName, &shipper.ABN, &shipper.TaxID,
			&shipper.ContactName, &shipper.ContactEmail, &shipper.ContactPhone, &addressJSON,
			&shipper.Status, &shipper.CreditLimit, &shipper.PaymentTerms, &shipper.Rating,
			&shipper.TotalJobs, &shipper.CreatedAt, &shipper.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if addressJSON != nil {
			shipper.BusinessAddress = &model.Address{}
			json.Unmarshal(addressJSON, shipper.BusinessAddress)
		}

		shippers = append(shippers, shipper)
	}

	return shippers, nil
}
