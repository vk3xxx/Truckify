-- Passkey credentials table for WebAuthn
CREATE TABLE IF NOT EXISTS passkey_credentials (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id BYTEA UNIQUE NOT NULL,
    public_key BYTEA NOT NULL,
    attestation_type VARCHAR(50),
    aaguid BYTEA,
    sign_count INTEGER DEFAULT 0,
    name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_passkey_credentials_user_id ON passkey_credentials(user_id);
CREATE INDEX idx_passkey_credentials_credential_id ON passkey_credentials(credential_id);

-- Store WebAuthn challenges temporarily
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id UUID PRIMARY KEY,
    user_id UUID,
    challenge BYTEA NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'registration' or 'authentication'
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
