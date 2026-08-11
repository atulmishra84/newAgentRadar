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
CREATE TABLE IF NOT EXISTS models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name varchar(255) NOT NULL,
    vendor varchar(255),
    type varchar(255),
    task varchar(255),
    agents jsonb,
    risk varchar(50) DEFAULT 'medium',
    phi boolean DEFAULT false,
    validated boolean DEFAULT false,
    version varchar(50),
    last_audit timestamp
);

INSERT INTO models (tenant_id, name, vendor, type, task, agents, risk, phi, validated, version, last_audit) VALUES 
('00000000-0000-0000-0000-000000000001', 'clinical-bert-v2', 'HuggingFace', 'NLP', 'Clinical NER / Coding', '[13, 15]', 'medium', true, true, '2.1.0', '2025-03-01'),
('00000000-0000-0000-0000-000000000001', 'radiology-vit-large', 'Internal', 'Vision Transformer', 'Radiology Report Generation', '[14]', 'high', true, false, '1.3.2', '2025-01-15'),
('00000000-0000-0000-0000-000000000001', 'drug-interaction-classifier', 'OpenFDA', 'Gradient Boost', 'Drug Interaction Detection', '[16]', 'low', false, true, '4.0.1', '2025-04-01'),
('00000000-0000-0000-0000-000000000001', 'gpt-4o', 'OpenAI', 'LLM', 'General Automation', '[1]', 'critical', false, false, '2024-11', null),
('00000000-0000-0000-0000-000000000001', 'claude-3-7-sonnet', 'Anthropic', 'LLM', 'Ops & Tooling', '[8]', 'low', false, true, '20250219', '2025-03-15'),
('00000000-0000-0000-0000-000000000001', 'genomics-risk-scorer', 'Internal', 'Neural Net', 'Polygenic Risk Scoring', '[18]', 'high', true, false, '0.9.1', null);
CREATE TABLE IF NOT EXISTS approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    agent_id text NOT NULL,
    stage varchar(50) DEFAULT 'pending', -- pending, review, approved, rejected
    submitted_by varchar(255),
    note text,
    submitted_at timestamp DEFAULT now(),
    resolved_at timestamp,
    resolved_by varchar(255)
);

INSERT INTO approvals (tenant_id, agent_id, stage, submitted_by, note, submitted_at) VALUES 
('00000000-0000-0000-0000-000000000001', 'cb4a1bac-2ee9-47af-951b-c2b2f6409b4b', 'pending', 'system', 'Auto-flagged by scanner.', '2026-08-09 10:00:00'),
('00000000-0000-0000-0000-000000000001', '12106a2b-52f7-4781-b480-2efbfb39a0e7', 'pending', 'system', 'Port 8899 scan detected.', '2026-08-09 11:30:00'),
('00000000-0000-0000-0000-000000000001', 'fa35e181-a249-4f6c-ba2c-3532f85a2f63', 'review', 'system', 'Unknown ML endpoint â€” investigating.', '2026-08-08 14:00:00'),
('00000000-0000-0000-0000-000000000001', 'c2b04306-3e2d-46f1-981d-35027c113fe2', 'pending', 'user@healthcareglobal.com', 'Employee using LangChain for doc search.', '2026-08-08 09:15:00'),
('00000000-0000-0000-0000-000000000001', '68f2b24f-07a9-4c09-aa09-02db42d5e9d5', 'review', 'user@healthcareglobal.com', 'Zapier for workflow automation.', '2026-08-06 16:45:00');

INSERT INTO approvals (tenant_id, agent_id, stage, submitted_by, note, submitted_at, resolved_at, resolved_by) VALUES 
('00000000-0000-0000-0000-000000000001', '5ba50a49-e269-409d-a9bd-fcbabfc87781', 'approved', 'dev@healthcareglobal.com', 'DataSync ETL Bot initial request', '2026-03-14 10:00:00', '2026-03-15 14:00:00', 'Admin'),
('00000000-0000-0000-0000-000000000001', '01f3b8d1-e560-4b8c-8754-ebcf775cd3a9', 'rejected', 'system', 'Rogue Crawler v1 detected', '2026-03-09 10:00:00', '2026-03-10 14:00:00', 'Admin'),
('00000000-0000-0000-0000-000000000001', '677b155a-c4d1-4219-97b4-2573434b1acc', 'approved', 'analyst@healthcareglobal.com', 'Claude Ops Agent initial approval', '2026-01-19 10:00:00', '2026-01-20 14:00:00', 'Admin');
CREATE TABLE IF NOT EXISTS playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  trigger_type varchar(50) NOT NULL,
  trigger_condition jsonb,
  steps jsonb,
  severity varchar(50) DEFAULT 'high',
  auto_execute boolean DEFAULT false,
  webhook_url text,
  notify_email text,
  created_by varchar(255),
  tenant_id uuid,
  status varchar(50) DEFAULT 'active',
  executions integer DEFAULT 0,
  last_executed timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS icon varchar(50);
ALTER TABLE playbooks ADD COLUMN IF NOT EXISTS tags jsonb;

CREATE TABLE IF NOT EXISTS playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES playbooks(id),
  agent_id text,
  status varchar(50) DEFAULT 'running',
  logs jsonb,
  created_at timestamp DEFAULT now(),
  completed_at timestamp
);

-- Seed playbooks if they don't exist
INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000001', 'Shadow AI Containment', '4 hours', 'manual', '{}'::jsonb, '["Isolate agent network access", "Notify security team and CISO", "Preserve agent logs and evidence", "Conduct root cause analysis", "Implement governance controls and re-approve"]'::jsonb, 'critical', true, 'system', '00000000-0000-0000-0000-000000000001', 'ðŸ”’', '["Shadow AI", "Containment", "Network"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000001');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000002', 'PHI Breach Response', '1 hour', 'manual', '{}'::jsonb, '["Immediately quarantine agent", "Assess PHI scope & affected records", "Notify Privacy Officer within 1 hour", "File HIPAA breach report if >500 records", "Execute BAA review and remediation"]'::jsonb, 'critical', false, 'system', '00000000-0000-0000-0000-000000000001', 'ðŸ¥', '["HIPAA", "PHI", "Breach"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000002');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000003', 'GDPR Compliance Remediation', '72 hours', 'manual', '{}'::jsonb, '["Identify all PII-accessing agents", "Verify lawful basis documentation", "Execute DPA with vendor within 72h", "Implement data minimization controls", "Update privacy notice and ROPA"]'::jsonb, 'high', false, 'system', '00000000-0000-0000-0000-000000000001', 'ðŸ“œ', '["GDPR", "PII", "Compliance"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000003');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000004', 'Credential Exposure Response', '30 minutes', 'manual', '{}'::jsonb, '["Immediately rotate compromised credentials", "Revoke all tokens and API keys", "Scan all repos for additional exposure", "Audit API key usage logs", "Implement secrets management (Vault/etc)"]'::jsonb, 'critical', true, 'system', '00000000-0000-0000-0000-000000000001', 'ðŸ”‘', '["Credentials", "Secrets", "GitHub"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000004');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000005', 'EU AI Act Conformity', '30 days', 'manual', '{}'::jsonb, '["Classify AI system risk tier", "Conduct conformity assessment", "Implement human oversight controls", "Register in EU AI database if required", "Update technical documentation"]'::jsonb, 'high', false, 'system', '00000000-0000-0000-0000-000000000001', 'âš–ï¸', '["EU AI Act", "Regulatory", "High-risk AI"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000005');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000006', 'MCP/A2A Agent Governance', '48 hours', 'manual', '{}'::jsonb, '["Discover all MCP server configs", "Assess tool access and capabilities", "Implement principle of least privilege", "Register in agent inventory", "Configure audit logging for all tool calls"]'::jsonb, 'medium', true, 'system', '00000000-0000-0000-0000-000000000001', 'ðŸ”—', '["MCP", "A2A", "Claude Code"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000006');
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255),
    description TEXT,
    config JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO policies (tenant_id, name, description, config, enabled) VALUES 
('00000000-0000-0000-0000-000000000001', 'No PII without GDPR compliance', 'Any agent accessing PII must have GDPR = pass', '{"cond": "pii_no_gdpr", "act": "flag"}', true),
('00000000-0000-0000-0000-000000000001', 'Shadow critical auto-alert', 'Critical-risk shadow agents trigger CISO alert', '{"cond": "shadow_critical", "act": "alert"}', true),
('00000000-0000-0000-0000-000000000001', 'No unknown protocols', 'Agents with unknown protocols must be reviewed', '{"cond": "unknown_proto", "act": "flag"}', true),
('00000000-0000-0000-0000-000000000001', 'Cloud SOC2 requirement', 'All cloud agents must have SOC2 = pass', '{"cond": "cloud_no_soc2", "act": "flag"}', false),
('00000000-0000-0000-0000-000000000001', 'PHI requires HIPAA compliance', 'Any agent with PHI access must have HIPAA = pass', '{"cond": "phi_no_hipaa", "act": "alert"}', true),
('00000000-0000-0000-0000-000000000001', 'FHIR without HIPAA blocked', 'Agents using FHIR protocols must pass HIPAA controls', '{"cond": "fhir_no_hipaa", "act": "flag"}', true);
CREATE TABLE IF NOT EXISTS tenant_ai_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS baa_status VARCHAR(50);

UPDATE agents 
SET phi = true, 
    baa_status = 'unsigned', 
    controls = '{"hipaa":"fail", "encryption":"fail"}' 
WHERE name IN ('cae-jarvis', 'acrorchestratorc39f7f');

CREATE TABLE IF NOT EXISTS notifications (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), tenant_id UUID, title VARCHAR(255), message TEXT, type VARCHAR(50), read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());
