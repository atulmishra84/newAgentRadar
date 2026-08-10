-- AgentRadar — Full Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'analyst'
                    CHECK (role IN ('platform_admin', 'ciso', 'analyst', 'auditor', 'viewer')),
  password_hash   TEXT NOT NULL,
  mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
  mfa_secret_enc  TEXT,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

CREATE TABLE IF NOT EXISTS agents (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL DEFAULT 'agent',
  category           TEXT NOT NULL DEFAULT 'cloud'
                       CHECK (category IN (
                         'cloud','saas','healthcare','ide','local','local_llm',
                         'framework','mcp','browser','ci','autonomous'
                       )),
  environment        TEXT NOT NULL DEFAULT 'production',
  version            TEXT,
  hosting            TEXT,
  model_ref          TEXT,
  shadow             BOOLEAN NOT NULL DEFAULT false,
  phi_flag           BOOLEAN NOT NULL DEFAULT false,
  pii_flag           BOOLEAN NOT NULL DEFAULT false,
  confidence         TEXT NOT NULL DEFAULT 'candidate'
                       CHECK (confidence IN ('confirmed','likely','candidate')),
  lifecycle          TEXT NOT NULL DEFAULT 'active'
                       CHECK (lifecycle IN ('active','dormant','under_review','approved','retired','quarantined')),
  owner              TEXT,
  review_cadence_days INTEGER DEFAULT 90,
  last_reviewed_at   TIMESTAMPTZ,
  detection_sources  JSONB NOT NULL DEFAULT '[]',
  data_stores        JSONB NOT NULL DEFAULT '[]',
  protocols          JSONB NOT NULL DEFAULT '[]',
  metadata           JSONB NOT NULL DEFAULT '{}',
  tags               JSONB NOT NULL DEFAULT '{}',
  risk_score         INTEGER NOT NULL DEFAULT 0,
  risk_level         TEXT NOT NULL DEFAULT 'low'
                       CHECK (risk_level IN ('critical','high','medium','low')),
  risk_factors       JSONB NOT NULL DEFAULT '[]',
  framework_scores   JSONB NOT NULL DEFAULT '{}',
  baa_status         TEXT NOT NULL DEFAULT 'na'
                       CHECK (baa_status IN ('signed','pending','missing','na')),
  first_discovered   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_shadow ON agents(tenant_id) WHERE shadow = true;
CREATE INDEX IF NOT EXISTS idx_agents_phi ON agents(tenant_id) WHERE phi_flag = true;
CREATE INDEX IF NOT EXISTS idx_agents_risk ON agents(tenant_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_agents_name_trgm ON agents USING gin (name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS baa_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('signed','pending','missing')),
  signatory     TEXT,
  signed_at     TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  document_url  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, agent_id)
);

CREATE TABLE IF NOT EXISTS connectors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  provider      TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'cloud',
  status        TEXT NOT NULL DEFAULT 'inactive'
                  CHECK (status IN ('active','inactive','error')),
  ciphertext    TEXT,
  iv            TEXT,
  auth_tag      TEXT,
  last_tested   TIMESTAMPTZ,
  last_scanned  TIMESTAMPTZ,
  agents_found  INTEGER NOT NULL DEFAULT 0,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS discovery_scans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id  UUID REFERENCES connectors(id) ON DELETE SET NULL,
  category      TEXT,
  status        TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','complete','error')),
  agents_found  INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  triggered_by  UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS discovery_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL,
  detail        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_events_tenant ON discovery_events(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS policies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  auto_remediate BOOLEAN NOT NULL DEFAULT false,
  config        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS policy_violations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  policy_id     UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','remediated','accepted')),
  detail        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  remediated_at TIMESTAMPTZ,
  UNIQUE (tenant_id, policy_id, agent_id, status)
);

CREATE TABLE IF NOT EXISTS playbooks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  trigger_type  TEXT NOT NULL DEFAULT 'manual'
                  CHECK (trigger_type IN ('manual','automatic')),
  auto_mode     BOOLEAN NOT NULL DEFAULT false,
  webhook_url   TEXT,
  steps         JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS playbook_runs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  playbook_id   UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running','complete','error')),
  step_log      JSONB NOT NULL DEFAULT '[]',
  triggered_by  UUID REFERENCES users(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS models (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  vendor        TEXT NOT NULL,
  hosting_type  TEXT NOT NULL DEFAULT 'cloud'
                  CHECK (hosting_type IN ('cloud','saas','local','self_hosted')),
  baa_available BOOLEAN NOT NULL DEFAULT false,
  soc2          BOOLEAN NOT NULL DEFAULT false,
  hipaa_capable BOOLEAN NOT NULL DEFAULT false,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  avg_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count    INTEGER NOT NULL DEFAULT 0,
  medium_count  INTEGER NOT NULL DEFAULT 0,
  low_count     INTEGER NOT NULL DEFAULT 0,
  total_agents  INTEGER NOT NULL DEFAULT 0,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_snapshots_tenant ON risk_snapshots(tenant_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  detail      JSONB NOT NULL DEFAULT '{}',
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON admin_audit_log(tenant_id, created_at DESC);

CREATE OR REPLACE RULE admin_audit_log_no_update AS
  ON UPDATE TO admin_audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE admin_audit_log_no_delete AS
  ON DELETE TO admin_audit_log DO INSTEAD NOTHING;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Recommendations 1–10 platform upgrades

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS risk_weights JSONB NOT NULL DEFAULT '{
    "phi":20,"pii":10,"shadow":25,"compliance_per_fail":3,"compliance_cap":20,
    "no_owner":10,"never_reviewed":10
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS positioning TEXT NOT NULL DEFAULT 'Your CMDB for AI agents',
  ADD COLUMN IF NOT EXISTS sso_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS risk_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_accepted_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_accepted_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS risk_accept_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_fingerprint
  ON agents(tenant_id, fingerprint) WHERE fingerprint IS NOT NULL;

ALTER TABLE connectors
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'demo'
    CHECK (mode IN ('demo','live')),
  ADD COLUMN IF NOT EXISTS first_wave BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS enforcement_webhooks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'generic'
                  CHECK (kind IN ('generic','servicenow','zscaler','netskope','edr','entra')),
  url           TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  events       JSONB NOT NULL DEFAULT '["agent.quarantine","agent.approve"]',
  secret        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS enforcement_deliveries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_id    UUID REFERENCES enforcement_webhooks(id) ON DELETE SET NULL,
  event         TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','delivered','failed','simulated')),
  response_code INTEGER,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_acceptances (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  accepted_by   UUID REFERENCES users(id),
  reason        TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','revoked')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sso_role_mappings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  claim_name    TEXT NOT NULL DEFAULT 'roles',
  claim_value   TEXT NOT NULL,
  role          TEXT NOT NULL
                  CHECK (role IN ('platform_admin','ciso','analyst','auditor','viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, claim_name, claim_value)
);

-- Mark first-wave providers when connectors exist
UPDATE connectors SET first_wave = true
WHERE provider IN ('azure','crowdstrike','intune','defender','github','epic');

-- Future-work closeout: multi-tenant operator + PHI inspection
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform_operator BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS phi_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phi_inspected_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS phi_inspection_runs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES agents(id) ON DELETE CASCADE,
  findings      JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_delta    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phi_runs_tenant ON phi_inspection_runs(tenant_id, created_at DESC);

-- end recommendations

