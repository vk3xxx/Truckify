CREATE TABLE IF NOT EXISTS backhaul_opportunities (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    origin_state VARCHAR(50) NOT NULL,
    origin_lat DECIMAL(10,7) NOT NULL,
    origin_lng DECIMAL(10,7) NOT NULL,
    dest_city VARCHAR(100) NOT NULL,
    dest_state VARCHAR(50) NOT NULL,
    dest_lat DECIMAL(10,7) NOT NULL,
    dest_lng DECIMAL(10,7) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    pickup_date TIMESTAMP NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backhaul_status ON backhaul_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_backhaul_vehicle ON backhaul_opportunities(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_backhaul_pickup ON backhaul_opportunities(pickup_date);
