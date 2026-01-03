-- Create event_type enum
CREATE TYPE event_type AS ENUM ('location', 'geofence', 'speed_alert', 'job_start', 'job_end');

-- Create tracking_events table
CREATE TABLE IF NOT EXISTS tracking_events (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    speed DECIMAL(5, 2) DEFAULT 0,
    heading DECIMAL(5, 2) DEFAULT 0,
    timestamp TIMESTAMP NOT NULL,
    event_type event_type NOT NULL DEFAULT 'location',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tracking_events_job_id ON tracking_events(job_id);
CREATE INDEX idx_tracking_events_driver_id ON tracking_events(driver_id);
CREATE INDEX idx_tracking_events_timestamp ON tracking_events(timestamp);
CREATE INDEX idx_tracking_events_driver_timestamp ON tracking_events(driver_id, timestamp DESC);
CREATE INDEX idx_tracking_events_job_timestamp ON tracking_events(job_id, timestamp DESC);
CREATE INDEX idx_tracking_events_event_type ON tracking_events(event_type);

-- Create spatial index for location-based queries (requires PostGIS extension)
-- CREATE INDEX idx_tracking_events_location ON tracking_events USING GIST (ST_Point(longitude, latitude));