-- Insurance policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    vehicle_id UUID,
    policy_number VARCHAR(100) NOT NULL,
    provider VARCHAR(200) NOT NULL,
    policy_type VARCHAR(50) NOT NULL, -- comprehensive, third_party, cargo, liability
    coverage_amount DECIMAL(12,2) NOT NULL,
    premium DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, expired, cancelled
    document_id UUID,
    verified_at TIMESTAMP,
    verified_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insurance claims table
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES insurance_policies(id),
    job_id UUID,
    claim_number VARCHAR(100),
    incident_date DATE NOT NULL,
    incident_type VARCHAR(50) NOT NULL, -- accident, theft, damage, cargo_loss
    description TEXT NOT NULL,
    claim_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'submitted', -- submitted, under_review, approved, rejected, paid
    documents JSONB DEFAULT '[]',
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_policies_user ON insurance_policies(user_id);
CREATE INDEX idx_policies_status ON insurance_policies(status);
CREATE INDEX idx_policies_end_date ON insurance_policies(end_date);
CREATE INDEX idx_claims_policy ON insurance_claims(policy_id);
CREATE INDEX idx_claims_status ON insurance_claims(status);
