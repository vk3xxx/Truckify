-- Pricing service migration

-- Subscription tiers
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    monthly_price DECIMAL(10,2) NOT NULL,
    annual_price DECIMAL(10,2),
    base_commission_rate DECIMAL(5,2) NOT NULL,
    description TEXT,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    tier_id UUID NOT NULL REFERENCES subscription_tiers(id),
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commission tiers (job value based discounts)
CREATE TABLE IF NOT EXISTS commission_tiers (
    id UUID PRIMARY KEY,
    min_job_value DECIMAL(10,2) NOT NULL,
    max_job_value DECIMAL(10,2),
    rate_discount DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform settings
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, monthly_price, annual_price, base_commission_rate, description, features) VALUES
    ('00000000-0000-0000-0000-000000000001', 'free', 0, 0, 15.00, 'Free tier for getting started', '["Basic job posting", "Standard support"]'),
    ('00000000-0000-0000-0000-000000000002', 'basic', 99, 990, 10.00, 'For growing businesses', '["Priority matching", "Email support", "Basic analytics"]'),
    ('00000000-0000-0000-0000-000000000003', 'pro', 299, 2990, 7.00, 'For established operators', '["Premium matching", "Phone support", "Advanced analytics", "API access"]'),
    ('00000000-0000-0000-0000-000000000004', 'enterprise', 799, 7990, 5.00, 'For large fleets', '["Dedicated account manager", "Custom integrations", "SLA guarantee", "White-label options"]')
ON CONFLICT (id) DO NOTHING;

-- Insert default commission tiers (discounts based on job value)
INSERT INTO commission_tiers (id, min_job_value, max_job_value, rate_discount) VALUES
    ('00000000-0000-0000-0001-000000000001', 0, 499.99, 0),
    ('00000000-0000-0000-0001-000000000002', 500, 1999.99, 1.00),
    ('00000000-0000-0000-0001-000000000003', 2000, NULL, 2.00)
ON CONFLICT (id) DO NOTHING;

-- Insert default platform settings
INSERT INTO platform_settings (key, value) VALUES
    ('minimum_platform_fee', '25'),
    ('payment_processing_fee_percent', '2.9'),
    ('payment_processing_fee_fixed', '0.30')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
