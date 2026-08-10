-- Close remaining platform gaps: multi-tenant control plane + PHI inspection findings

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

-- Mark seed platform admin as operator when present
UPDATE users SET platform_operator = true
WHERE role = 'platform_admin' AND email ILIKE 'admin@%';
