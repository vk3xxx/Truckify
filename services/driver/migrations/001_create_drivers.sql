-- Driver service migration
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL,
    license_state VARCHAR(10) NOT NULL,
    license_expiry TIMESTAMP NOT NULL,
    license_class VARCHAR(20) NOT NULL,
    years_experience INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT false,
    current_location JSONB,
    rating DECIMAL(3,2) DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    plate VARCHAR(20) NOT NULL UNIQUE,
    capacity DECIMAL(10,2) NOT NULL,
    rego_expiry TIMESTAMP NOT NULL,
    insurance_expiry TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_available ON drivers(is_available, status);
CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_type ON vehicles(type);
