CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_bids_job_id ON bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_driver_id ON bids(driver_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
