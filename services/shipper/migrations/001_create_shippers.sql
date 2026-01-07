-- Shipper service migration
CREATE TABLE IF NOT EXISTS shippers (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    abn VARCHAR(11),
    tax_id VARCHAR(50),
    contact_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    business_address JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    credit_limit DECIMAL(12,2),
    payment_terms INTEGER,
    rating DECIMAL(3,2) DEFAULT 0,
    total_jobs INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shippers_user_id ON shippers(user_id);
CREATE INDEX idx_shippers_status ON shippers(status);
CREATE INDEX idx_shippers_company_name ON shippers(company_name);
CREATE INDEX idx_shippers_created_at ON shippers(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_shippers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shippers_updated_at
BEFORE UPDATE ON shippers
FOR EACH ROW EXECUTE FUNCTION update_shippers_updated_at();
