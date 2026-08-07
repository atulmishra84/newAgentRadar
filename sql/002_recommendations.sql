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
