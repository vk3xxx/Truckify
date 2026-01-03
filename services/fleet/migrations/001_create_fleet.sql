-- Fleet service migration

-- Fleets table
CREATE TABLE IF NOT EXISTS fleets (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    abn VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet vehicles (separate from driver-owned vehicles)
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id UUID PRIMARY KEY,
    fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
    current_driver_id UUID,
    type VARCHAR(50) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    plate VARCHAR(20) NOT NULL UNIQUE,
    vin VARCHAR(50),
    capacity DECIMAL(10,2) NOT NULL,
    rego_expiry TIMESTAMP NOT NULL,
    insurance_expiry TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    current_location JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fleet drivers (links drivers to fleets)
CREATE TABLE IF NOT EXISTS fleet_drivers (
    id UUID PRIMARY KEY,
    fleet_id UUID NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fleet_id, driver_id)
);

-- Vehicle handover requests
CREATE TABLE IF NOT EXISTS vehicle_handovers (
    id UUID PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id),
    job_id UUID,
    from_driver_id UUID,
    to_driver_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    location JSONB,
    notes TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX idx_fleets_owner ON fleets(owner_id);
CREATE INDEX idx_fleet_vehicles_fleet ON fleet_vehicles(fleet_id);
CREATE INDEX idx_fleet_vehicles_driver ON fleet_vehicles(current_driver_id);
CREATE INDEX idx_fleet_vehicles_status ON fleet_vehicles(status);
CREATE INDEX idx_fleet_drivers_fleet ON fleet_drivers(fleet_id);
CREATE INDEX idx_fleet_drivers_driver ON fleet_drivers(driver_id);
CREATE INDEX idx_handovers_vehicle ON vehicle_handovers(vehicle_id);
CREATE INDEX idx_handovers_status ON vehicle_handovers(status);
