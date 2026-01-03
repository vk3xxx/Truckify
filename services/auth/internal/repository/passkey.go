package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"truckify/services/auth/internal/model"
)

// Passkey repository methods

func (r *Repository) SavePasskeyCredential(ctx context.Context, cred *model.PasskeyCredential) error {
	query := `
		INSERT INTO passkey_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, name, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.ExecContext(ctx, query,
		cred.ID, cred.UserID, cred.CredentialID, cred.PublicKey,
		cred.AttestationType, cred.AAGUID, cred.SignCount, cred.Name, cred.CreatedAt,
	)
	return err
}

func (r *Repository) GetPasskeyCredentialsByUserID(ctx context.Context, userID uuid.UUID) ([]webauthn.Credential, error) {
	query := `
		SELECT credential_id, public_key, attestation_type, aaguid, sign_count
		FROM passkey_credentials WHERE user_id = $1
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []webauthn.Credential
	for rows.Next() {
		var c webauthn.Credential
		var attestationType string
		var aaguid []byte
		err := rows.Scan(&c.ID, &c.PublicKey, &attestationType, &aaguid, &c.Authenticator.SignCount)
		if err != nil {
			return nil, err
		}
		c.AttestationType = attestationType
		if len(aaguid) == 16 {
			copy(c.Authenticator.AAGUID[:], aaguid)
		}
		creds = append(creds, c)
	}
	return creds, nil
}

func (r *Repository) UpdatePasskeySignCount(ctx context.Context, credentialID []byte, signCount uint32) error {
	query := `UPDATE passkey_credentials SET sign_count = $1, last_used_at = $2 WHERE credential_id = $3`
	_, err := r.db.ExecContext(ctx, query, signCount, time.Now(), credentialID)
	return err
}

func (r *Repository) GetUserPasskeys(ctx context.Context, userID uuid.UUID) ([]model.PasskeyCredential, error) {
	query := `
		SELECT id, user_id, name, sign_count, created_at, last_used_at
		FROM passkey_credentials WHERE user_id = $1 ORDER BY created_at DESC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creds []model.PasskeyCredential
	for rows.Next() {
		var c model.PasskeyCredential
		err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.SignCount, &c.CreatedAt, &c.LastUsedAt)
		if err != nil {
			return nil, err
		}
		creds = append(creds, c)
	}
	return creds, nil
}

func (r *Repository) DeletePasskey(ctx context.Context, userID, passkeyID uuid.UUID) error {
	query := `DELETE FROM passkey_credentials WHERE id = $1 AND user_id = $2`
	result, err := r.db.ExecContext(ctx, query, passkeyID, userID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrUserNotFound
	}
	return nil
}

// Challenge storage
func (r *Repository) SaveChallenge(ctx context.Context, ch *model.WebAuthnChallenge) error {
	query := `INSERT INTO webauthn_challenges (id, user_id, challenge, type, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := r.db.ExecContext(ctx, query, ch.ID, ch.UserID, []byte(ch.Challenge), ch.Type, ch.CreatedAt, ch.ExpiresAt)
	return err
}

func (r *Repository) GetChallenge(ctx context.Context, userID *uuid.UUID, challengeType string) (*model.WebAuthnChallenge, error) {
	query := `SELECT id, user_id, challenge, type, created_at, expires_at FROM webauthn_challenges 
		WHERE user_id = $1 AND type = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`
	ch := &model.WebAuthnChallenge{}
	var challengeBytes []byte
	err := r.db.QueryRowContext(ctx, query, userID, challengeType).Scan(
		&ch.ID, &ch.UserID, &challengeBytes, &ch.Type, &ch.CreatedAt, &ch.ExpiresAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	ch.Challenge = string(challengeBytes)
	return ch, err
}

func (r *Repository) DeleteChallenge(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM webauthn_challenges WHERE id = $1`, id)
	return err
}

func (r *Repository) CleanupExpiredChallenges(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM webauthn_challenges WHERE expires_at < NOW()`)
	return err
}
