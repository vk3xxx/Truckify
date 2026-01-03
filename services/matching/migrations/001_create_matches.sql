-- Matching service migration
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, driver_id)
);

CREATE INDEX idx_matches_job_id ON matches(job_id);
CREATE INDEX idx_matches_driver_id ON matches(driver_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_expires ON matches(expires_at) WHERE status = 'pending';
