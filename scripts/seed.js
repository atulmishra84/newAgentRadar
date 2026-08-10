'use strict';

const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv(path.join(__dirname, '../.env'));

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const {
  scoreAgent,
  buildFrameworkScores,
  confidenceFromSources,
  agentFingerprint,
  DEFAULT_RISK_WEIGHTS,
} = require('../packages/shared/src');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'agentradar',
  user: process.env.POSTGRES_USER || 'agentradar',
  password: process.env.POSTGRES_PASSWORD || 'agentradar',
});

const USERS = [
  { email: 'admin@acme.health', name: 'Platform Admin', role: 'platform_admin', password: 'Admin123!' },
  { email: 'ciso@acme.health', name: 'Alex Rivera', role: 'ciso', password: 'Ciso123!' },
  { email: 'analyst@acme.health', name: 'Sam Chen', role: 'analyst', password: 'Analyst123!' },
  { email: 'auditor@acme.health', name: 'Jordan Lee', role: 'auditor', password: 'Auditor123!' },
  { email: 'viewer@acme.health', name: 'Taylor Kim', role: 'viewer', password: 'Viewer123!' },
];

const AGENTS = [
  { name: 'Azure OpenAI — Clinical Summary', category: 'cloud', environment: 'production', hosting: 'Azure', model_ref: 'Azure OpenAI', phi_flag: true, pii_flag: true, shadow: false, owner: 'clinical-ai@acme.health', detection_sources: ['azure', 'sentinel'], data_stores: ['Epic FHIR', 'Blob PHI'], baa_status: 'signed', last_reviewed_at: '2026-06-01' },
  { name: 'M365 Copilot — Enterprise', category: 'saas', environment: 'production', hosting: 'Microsoft 365', model_ref: 'GPT-4o', pii_flag: true, shadow: false, owner: 'it@acme.health', detection_sources: ['m365'], last_reviewed_at: '2026-07-15' },
  { name: 'Epic Cosmos AI Insights', category: 'healthcare', environment: 'production', hosting: 'Epic', model_ref: 'GPT-4o', phi_flag: true, pii_flag: true, shadow: false, owner: 'ehr-admin@acme.health', detection_sources: ['epic'], baa_status: 'signed', last_reviewed_at: '2026-05-20' },
  { name: 'Cerner CareAware AI', category: 'healthcare', environment: 'production', hosting: 'Cerner', phi_flag: true, shadow: false, owner: 'informatics@acme.health', detection_sources: ['cerner'], baa_status: 'pending' },
  { name: 'Bedrock Claims Assist', category: 'cloud', environment: 'production', hosting: 'AWS', model_ref: 'Claude 3.5', phi_flag: true, shadow: false, owner: 'claims@acme.health', detection_sources: ['aws'], baa_status: 'signed', last_reviewed_at: '2026-07-01' },
  { name: 'Vertex Imaging QA', category: 'cloud', environment: 'staging', hosting: 'GCP', model_ref: 'Gemini', phi_flag: true, shadow: false, owner: 'radiology@acme.health', detection_sources: ['gcp'], baa_status: 'missing' },
  { name: 'LangChain claims-bot', category: 'framework', environment: 'production', hosting: 'AKS', model_ref: 'Azure OpenAI', phi_flag: true, shadow: false, owner: 'platform@acme.health', detection_sources: ['github', 'azure'], last_reviewed_at: '2026-04-10' },
  { name: 'Internal MCP — fhir-tools', category: 'mcp', environment: 'production', hosting: 'Internal', phi_flag: true, shadow: false, owner: 'platform@acme.health', detection_sources: ['github'], baa_status: 'signed' },
  { name: 'GitHub Actions AI Release Notes', category: 'ci', environment: 'ci', hosting: 'GitHub', shadow: false, owner: 'devops@acme.health', detection_sources: ['github'] },
  { name: 'ServiceNow Now Assist', category: 'saas', environment: 'production', hosting: 'ServiceNow', pii_flag: true, shadow: false, owner: 'itsm@acme.health', detection_sources: ['servicenow'], last_reviewed_at: '2026-07-20' },
  { name: 'Salesforce Agentforce CRM', category: 'saas', environment: 'production', hosting: 'Salesforce', pii_flag: true, shadow: false, owner: 'sales-ops@acme.health', detection_sources: ['salesforce'] },
  { name: 'Ollama on WS-ENG-4421', category: 'local_llm', environment: 'endpoint', hosting: 'Local', model_ref: 'Ollama', shadow: true, detection_sources: ['crowdstrike'], protocols: ['localhost:11434'] },
  { name: 'LM Studio — CLIN-PC-08', category: 'local_llm', environment: 'endpoint', hosting: 'Local', model_ref: 'Mistral', shadow: true, phi_flag: true, detection_sources: ['defender', 'intune'], baa_status: 'missing' },
  { name: 'Cursor IDE — DEV-LAPTOP-19', category: 'ide', environment: 'endpoint', hosting: 'Local', model_ref: 'GPT-4o', shadow: true, pii_flag: true, detection_sources: ['crowdstrike'] },
  { name: 'claude.ai via Zscaler', category: 'saas', environment: 'corporate', hosting: 'Anthropic', model_ref: 'Claude 3.5', shadow: true, detection_sources: ['zscaler', 'netskope'] },
  { name: 'Browser AI Extension Cluster', category: 'browser', environment: 'endpoint', hosting: 'Chrome', shadow: true, detection_sources: ['cortex'] },
  { name: 'AutoGen ops swarm', category: 'autonomous', environment: 'staging', hosting: 'AKS', model_ref: 'GPT-4o', shadow: false, owner: 'platform@acme.health', detection_sources: ['github', 'azure', 'sentinel'], last_reviewed_at: '2026-07-28' },
  { name: 'Meditech Expanse CDS AI', category: 'healthcare', environment: 'production', hosting: 'Meditech', phi_flag: true, shadow: false, detection_sources: ['meditech'], baa_status: 'missing' },
];

const POLICIES = [
  ['shadow_phi_quarantine', 'Shadow AI with PHI', 'Auto-quarantine shadow agents with PHI access', true],
  ['phi_no_baa', 'PHI without BAA', 'Flag PHI agents missing BAA', false],
  ['unowned_agent', 'Unowned agent', 'Notify and request owner assignment', false],
  ['overdue_review', 'Overdue review', 'Trigger review when last review > 90 days', false],
  ['shadow_high_risk', 'Shadow AI high risk', 'Quarantine or escalate high-risk shadow agents', true],
  ['pii_no_owner', 'PII without owner', 'Notify security for PII agents without owner', false],
];

const PLAYBOOKS = [
  ['shadow_quarantine', 'Shadow AI Quarantine', 'Quarantine unauthorized shadow AI agents', 'automatic', ['Identify shadow agents', 'Set lifecycle=quarantined', 'Notify security', 'Log evidence']],
  ['baa_check', 'BAA Compliance Check', 'Find PHI agents missing BAA', 'manual', ['List PHI agents', 'Check BAA status', 'Flag missing BAAs', 'Alert compliance']],
  ['owner_assignment', 'Owner Assignment', 'Auto-suggest owners from tags', 'manual', ['Find unowned agents', 'Read tags.owner', 'Assign suggested owner', 'Notify assignee']],
  ['high_risk_review', 'High Risk Review', 'Move critical/high agents into review', 'automatic', ['Select high/critical agents', 'Set under_review', 'Create review tasks', 'Notify owners']],
  ['compliance_drift', 'Compliance Drift Alert', 'Alert when framework failures increase', 'automatic', ['Compute framework fail counts', 'Compare to baseline', 'Emit alert', 'Webhook notify']],
  ['new_agent_onboarding', 'New Agent Onboarding', 'Onboard newly discovered agents', 'manual', ['List candidate agents', 'Request owner', 'Schedule review', 'Mark under_review']],
];

const MODELS = [
  ['GPT-4o', 'OpenAI', 'cloud', true, true, true],
  ['Claude 3.5', 'Anthropic', 'cloud', true, true, true],
  ['Gemini', 'Google', 'cloud', true, true, true],
  ['Azure OpenAI', 'Microsoft', 'cloud', true, true, true],
  ['Llama 3', 'Meta', 'self_hosted', false, false, false],
  ['Mistral', 'Mistral AI', 'cloud', false, true, false],
  ['Ollama', 'Ollama', 'local', false, false, false],
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenant = await client.query(
      `INSERT INTO tenants (name, slug, risk_weights, sso_config)
       VALUES (
         'Acme Health',
         'acme-health',
         $1::jsonb,
         $2::jsonb
       )
       ON CONFLICT (slug) DO UPDATE SET
         name=EXCLUDED.name,
         risk_weights=EXCLUDED.risk_weights,
         sso_config=EXCLUDED.sso_config
       RETURNING id`,
      [
        JSON.stringify(DEFAULT_RISK_WEIGHTS),
        JSON.stringify({
          provider: 'entra',
          enabled: false,
          jit_provision: true,
          default_role: 'viewer',
        }),
      ]
    );
    const tenantId = tenant.rows[0].id;

    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO users (tenant_id, email, name, role, password_hash, platform_operator)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, email) DO UPDATE SET
           name=EXCLUDED.name, role=EXCLUDED.role, password_hash=EXCLUDED.password_hash,
           platform_operator=EXCLUDED.platform_operator`,
        [tenantId, u.email, u.name, u.role, hash, u.role === 'platform_admin']
      );
    }

    await client.query(`DELETE FROM enforcement_deliveries WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM enforcement_webhooks WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM risk_acceptances WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM sso_role_mappings WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM policy_violations WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM baa_records WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM discovery_events WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM connectors WHERE tenant_id=$1`, [tenantId]);
    await client.query(`DELETE FROM agents WHERE tenant_id=$1`, [tenantId]);

    const ssoMappings = [
      ['roles', 'AgentRadar.Admins', 'platform_admin'],
      ['roles', 'AgentRadar.CISO', 'ciso'],
      ['roles', 'AgentRadar.Analysts', 'analyst'],
      ['roles', 'AgentRadar.Auditors', 'auditor'],
    ];
    for (const [claim_name, claim_value, role] of ssoMappings) {
      await client.query(
        `INSERT INTO sso_role_mappings (tenant_id, claim_name, claim_value, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tenant_id, claim_name, claim_value) DO UPDATE SET role=EXCLUDED.role`,
        [tenantId, claim_name, claim_value, role]
      );
    }

    const webhooks = [
      ['ServiceNow ITSM', 'servicenow', 'https://acme.example/hooks/servicenow', ['agent.quarantine', 'agent.approve']],
      ['Zscaler CASB', 'zscaler', 'https://acme.example/hooks/zscaler', ['agent.quarantine']],
      ['CrowdStrike Falcon', 'edr', 'https://acme.example/hooks/crowdstrike', ['agent.quarantine']],
      ['Microsoft Entra ID', 'entra', 'https://acme.example/hooks/entra', ['agent.quarantine', 'agent.approve']],
    ];
    for (const [name, kind, url, events] of webhooks) {
      await client.query(
        `INSERT INTO enforcement_webhooks (tenant_id, name, kind, url, enabled, events, secret)
         VALUES ($1,$2,$3,$4,true,$5,'demo-secret')`,
        [tenantId, name, kind, url, JSON.stringify(events)]
      );
    }

    const demoConnectors = [
      ['Azure — Acme', 'azure', 'cloud', true],
      ['CrowdStrike Falcon', 'crowdstrike', 'edr', true],
      ['GitHub Org', 'github', 'git', true],
      ['Epic FHIR', 'epic', 'healthcare', true],
    ];
    for (const [name, provider, category, firstWave] of demoConnectors) {
      await client.query(
        `INSERT INTO connectors (tenant_id, name, provider, category, status, mode, first_wave, agents_found)
         VALUES ($1,$2,$3,$4,'active','demo',$5,0)`,
        [tenantId, name, provider, category, firstWave]
      );
    }

    for (const a of AGENTS) {
      const draft = {
        ...a,
        detection_sources: a.detection_sources || [],
        data_stores: a.data_stores || [],
        protocols: a.protocols || [],
        owner: a.owner || null,
        baa_status: a.baa_status || (a.phi_flag ? 'missing' : 'na'),
        external_id: a.external_id || `${(a.detection_sources || ['manual'])[0]}:${a.name.toLowerCase().replace(/\s+/g, '-')}`,
      };
      draft.framework_scores = buildFrameworkScores(draft);
      const scored = scoreAgent({ ...draft, framework_scores: draft.framework_scores });
      const confidence = confidenceFromSources(draft.detection_sources);
      const fingerprint = agentFingerprint(draft);

      const ins = await client.query(
        `INSERT INTO agents (
          tenant_id, name, category, environment, hosting, model_ref,
          shadow, phi_flag, pii_flag, owner, baa_status, lifecycle,
          detection_sources, data_stores, protocols,
          risk_score, risk_level, risk_factors, framework_scores, confidence,
          last_reviewed_at, tags, fingerprint, external_id
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        ) RETURNING id`,
        [
          tenantId,
          draft.name,
          draft.category,
          draft.environment,
          draft.hosting || null,
          draft.model_ref || null,
          !!draft.shadow,
          !!draft.phi_flag,
          !!draft.pii_flag,
          draft.owner,
          draft.baa_status,
          draft.shadow ? 'under_review' : 'active',
          JSON.stringify(draft.detection_sources),
          JSON.stringify(draft.data_stores || []),
          JSON.stringify(draft.protocols || []),
          scored.risk_score,
          scored.risk_level,
          JSON.stringify(scored.risk_factors),
          JSON.stringify(draft.framework_scores),
          confidence,
          draft.last_reviewed_at || null,
          JSON.stringify(draft.tags || {}),
          fingerprint,
          draft.external_id,
        ]
      );

      if (draft.phi_flag && draft.baa_status && draft.baa_status !== 'na') {
        await client.query(
          `INSERT INTO baa_records (tenant_id, agent_id, status, signatory, signed_at, document_url)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (tenant_id, agent_id) DO NOTHING`,
          [
            tenantId,
            ins.rows[0].id,
            draft.baa_status,
            draft.baa_status === 'signed' ? 'Acme Health Legal' : null,
            draft.baa_status === 'signed' ? '2025-11-01' : null,
            draft.baa_status === 'signed' ? 'https://contracts.acme.health/baa/epic' : null,
          ]
        );
      }
    }

    for (const p of POLICIES) {
      await client.query(
        `INSERT INTO policies (tenant_id, key, name, description, auto_remediate)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (tenant_id, key) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description`,
        [tenantId, p[0], p[1], p[2], p[3]]
      );
    }

    for (const p of PLAYBOOKS) {
      await client.query(
        `INSERT INTO playbooks (tenant_id, key, name, description, trigger_type, steps)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, key) DO UPDATE SET name=EXCLUDED.name, steps=EXCLUDED.steps`,
        [tenantId, p[0], p[1], p[2], p[3], JSON.stringify(p[4])]
      );
    }

    for (const m of MODELS) {
      await client.query(
        `INSERT INTO models (tenant_id, name, vendor, hosting_type, baa_available, soc2, hipaa_capable)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (tenant_id, name) DO NOTHING`,
        [tenantId, m[0], m[1], m[2], m[3], m[4], m[5]]
      );
    }

    // 7-day risk snapshots
    await client.query(`DELETE FROM risk_snapshots WHERE tenant_id=$1`, [tenantId]);
    for (let d = 6; d >= 0; d--) {
      const avg = 38 + Math.round(Math.random() * 12);
      await client.query(
        `INSERT INTO risk_snapshots
         (tenant_id, avg_score, critical_count, high_count, medium_count, low_count, total_agents, captured_at)
         VALUES ($1,$2,$3,$4,$5,$6,18, NOW() - ($7 || ' days')::interval)`,
        [tenantId, avg, 2, 4, 7, 5, String(d)]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log('Login: analyst@acme.health / Analyst123!');
    console.log('Also: admin@acme.health / Admin123!  |  ciso@acme.health / Ciso123!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
