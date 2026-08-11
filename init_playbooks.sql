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
SELECT 'a0000000-0000-0000-0000-000000000001', 'Shadow AI Containment', '4 hours', 'manual', '{}'::jsonb, '["Isolate agent network access", "Notify security team and CISO", "Preserve agent logs and evidence", "Conduct root cause analysis", "Implement governance controls and re-approve"]'::jsonb, 'critical', true, 'system', '00000000-0000-0000-0000-000000000001', '🔒', '["Shadow AI", "Containment", "Network"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000001');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000002', 'PHI Breach Response', '1 hour', 'manual', '{}'::jsonb, '["Immediately quarantine agent", "Assess PHI scope & affected records", "Notify Privacy Officer within 1 hour", "File HIPAA breach report if >500 records", "Execute BAA review and remediation"]'::jsonb, 'critical', false, 'system', '00000000-0000-0000-0000-000000000001', '🏥', '["HIPAA", "PHI", "Breach"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000002');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000003', 'GDPR Compliance Remediation', '72 hours', 'manual', '{}'::jsonb, '["Identify all PII-accessing agents", "Verify lawful basis documentation", "Execute DPA with vendor within 72h", "Implement data minimization controls", "Update privacy notice and ROPA"]'::jsonb, 'high', false, 'system', '00000000-0000-0000-0000-000000000001', '📜', '["GDPR", "PII", "Compliance"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000003');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000004', 'Credential Exposure Response', '30 minutes', 'manual', '{}'::jsonb, '["Immediately rotate compromised credentials", "Revoke all tokens and API keys", "Scan all repos for additional exposure", "Audit API key usage logs", "Implement secrets management (Vault/etc)"]'::jsonb, 'critical', true, 'system', '00000000-0000-0000-0000-000000000001', '🔑', '["Credentials", "Secrets", "GitHub"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000004');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000005', 'EU AI Act Conformity', '30 days', 'manual', '{}'::jsonb, '["Classify AI system risk tier", "Conduct conformity assessment", "Implement human oversight controls", "Register in EU AI database if required", "Update technical documentation"]'::jsonb, 'high', false, 'system', '00000000-0000-0000-0000-000000000001', '⚖️', '["EU AI Act", "Regulatory", "High-risk AI"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000005');

INSERT INTO playbooks (id, name, description, trigger_type, trigger_condition, steps, severity, auto_execute, created_by, tenant_id, icon, tags)
SELECT 'a0000000-0000-0000-0000-000000000006', 'MCP/A2A Agent Governance', '48 hours', 'manual', '{}'::jsonb, '["Discover all MCP server configs", "Assess tool access and capabilities", "Implement principle of least privilege", "Register in agent inventory", "Configure audit logging for all tool calls"]'::jsonb, 'medium', true, 'system', '00000000-0000-0000-0000-000000000001', '🔗', '["MCP", "A2A", "Claude Code"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM playbooks WHERE id = 'a0000000-0000-0000-0000-000000000006');
