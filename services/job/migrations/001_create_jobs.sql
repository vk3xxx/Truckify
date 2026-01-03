-- Job service migration
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY,
    shipper_id UUID NOT NULL,
    driver_id UUID,
    status VARCHAR(20) DEFAULT 'pending',
    pickup JSONB NOT NULL,
    delivery JSONB NOT NULL,
    pickup_date TIMESTAMP NOT NULL,
    delivery_date TIMESTAMP NOT NULL,
    cargo_type VARCHAR(100) NOT NULL,
    weight DECIMAL(10,2) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    distance DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jobs_shipper ON jobs(shipper_id);
CREATE INDEX idx_jobs_driver ON jobs(driver_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_vehicle_type ON jobs(vehicle_type);
CREATE INDEX idx_jobs_pickup_date ON jobs(pickup_date);
