CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    plan VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50),
    password_hash VARCHAR(255),
    password VARCHAR(255),
    mfa_secret TEXT,
    mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    user_id UUID,
    action VARCHAR(255),
    detail TEXT,
    message TEXT,
    agent_id UUID,
    severity VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    category VARCHAR(255),
    description TEXT,
    agent_id UUID,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255),
    type VARCHAR(255),
    env VARCHAR(255),
    risk VARCHAR(50),
    shadow BOOLEAN,
    phi BOOLEAN,
    pii BOOLEAN,
    hosted BOOLEAN,
    protocols TEXT,
    controls TEXT,
    metadata JSONB,
    detect TEXT,
    first_detected TIMESTAMP,
    last_seen TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID,
    framework VARCHAR(255),
    justification TEXT,
    expires_at TIMESTAMP,
    accepted_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    admin_email VARCHAR(255),
    action VARCHAR(255),
    resource VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    url TEXT,
    type VARCHAR(50),
    events JSONB,
    secret TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sso_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    provider VARCHAR(50),
    config JSONB,
    updated_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    config_key VARCHAR(255),
    config_val JSONB,
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    provider VARCHAR(255),
    credentials JSONB,
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scanner_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    scanner_id VARCHAR(255),
    status VARCHAR(50),
    agents_found INT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Seed Initial Data
INSERT INTO tenants (id, name, domain, plan)
VALUES ('7a570fd1-8a60-4115-9e1b-68f9102f4eab', 'Default Tenant', 'example.com', 'enterprise')
ON CONFLICT (id) DO NOTHING;

-- Seed Admin User (admin@agentradar.local / admin123)
INSERT INTO users (tenant_id, email, name, role, password_hash)
VALUES ('7a570fd1-8a60-4115-9e1b-68f9102f4eab', 'admin@agentradar.local', 'Admin User', 'ciso', '$2a$12$uOIqlglWlrOJqckhx4I/zu1wLHZCdlrxhL3xLNymyHpKcGDP1/.jW')
ON CONFLICT (email) DO NOTHING;
