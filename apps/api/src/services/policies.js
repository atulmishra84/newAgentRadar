'use strict';

const db = require('../models/db');
const { listAgents, updateAgent } = require('./agents');
const { logAudit } = require('./audit');

const BUILTIN = [
  {
    key: 'shadow_phi_quarantine',
    name: 'Shadow AI with PHI',
    description: 'Auto-quarantine shadow agents with PHI access',
    auto: true,
  },
  {
    key: 'phi_no_baa',
    name: 'PHI without BAA',
    description: 'Flag PHI agents missing BAA and alert compliance',
    auto: false,
  },
  {
    key: 'unowned_agent',
    name: 'Unowned agent',
    description: 'Notify and request owner assignment',
    auto: false,
  },
  {
    key: 'overdue_review',
    name: 'Overdue review',
    description: 'Trigger review when last review > 90 days',
    auto: false,
  },
  {
    key: 'shadow_high_risk',
    name: 'Shadow AI high risk',
    description: 'Quarantine or escalate high-risk shadow agents',
    auto: true,
  },
  {
    key: 'pii_no_owner',
    name: 'PII without owner',
    description: 'Notify security team for PII agents without owner',
    auto: false,
  },
];

async function ensurePolicies(tenantId) {
  for (const p of BUILTIN) {
    await db.query(
      `INSERT INTO policies (tenant_id, key, name, description, auto_remediate)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, key) DO NOTHING`,
      [tenantId, p.key, p.name, p.description, p.auto]
    );
  }
}

async function listPolicies(tenantId) {
  await ensurePolicies(tenantId);
  const { rows } = await db.query(
    `SELECT p.*,
       (SELECT COUNT(*)::int FROM policy_violations v
        WHERE v.policy_id=p.id AND v.status='open') AS violation_count
     FROM policies p WHERE p.tenant_id=$1 ORDER BY p.name`,
    [tenantId]
  );
  return rows;
}

function matches(policyKey, agent) {
  const daysSinceReview = agent.last_reviewed_at
    ? (Date.now() - new Date(agent.last_reviewed_at).getTime()) / 86400000
    : Infinity;

  switch (policyKey) {
    case 'shadow_phi_quarantine':
      return agent.shadow && agent.phi_flag;
    case 'phi_no_baa':
      return agent.phi_flag && agent.baa_status === 'missing';
    case 'unowned_agent':
      return !agent.owner;
    case 'overdue_review':
      return daysSinceReview > 90;
    case 'shadow_high_risk':
      return agent.shadow && (agent.risk_level === 'high' || agent.risk_level === 'critical');
    case 'pii_no_owner':
      return agent.pii_flag && !agent.owner;
    default:
      return false;
  }
}

async function runPolicy(tenantId, policyId, { remediate = false, user, req } = {}) {
  const { rows } = await db.query(
    `SELECT * FROM policies WHERE tenant_id=$1 AND id=$2`,
    [tenantId, policyId]
  );
  const policy = rows[0];
  if (!policy) throw new Error('Policy not found');

  const agents = await listAgents(tenantId);
  const hits = agents.filter((a) => matches(policy.key, a));
  const results = [];

  for (const agent of hits) {
    await db.query(
      `INSERT INTO policy_violations (tenant_id, policy_id, agent_id, status, detail)
       VALUES ($1,$2,$3,'open',$4)
       ON CONFLICT DO NOTHING`,
      [tenantId, policy.id, agent.id, JSON.stringify({ policy: policy.key })]
    );

    if (remediate || policy.auto_remediate) {
      if (policy.key === 'shadow_phi_quarantine' || policy.key === 'shadow_high_risk') {
        await updateAgent(tenantId, agent.id, { lifecycle: 'quarantined', shadow: true });
      }
      if (policy.key === 'overdue_review') {
        await updateAgent(tenantId, agent.id, { lifecycle: 'under_review' });
      }
      await db.query(
        `UPDATE policy_violations SET status='remediated', remediated_at=NOW()
         WHERE tenant_id=$1 AND policy_id=$2 AND agent_id=$3 AND status='open'`,
        [tenantId, policy.id, agent.id]
      );
    }
    results.push({ agent_id: agent.id, name: agent.name });
  }

  await logAudit({
    tenantId,
    actorId: user?.sub,
    actorEmail: user?.email,
    action: remediate ? 'policy.remediate' : 'policy.run',
    detail: { policy: policy.key, count: results.length },
    req,
  });

  return { policy, violations: results };
}

async function remediateAll(tenantId, user, req) {
  const policies = await listPolicies(tenantId);
  const out = [];
  for (const p of policies) {
    out.push(await runPolicy(tenantId, p.id, { remediate: true, user, req }));
  }
  return out;
}

async function policyAgents(tenantId, policyId) {
  const { rows } = await db.query(
    `SELECT a.* FROM policy_violations v
     JOIN agents a ON a.id = v.agent_id
     WHERE v.tenant_id=$1 AND v.policy_id=$2 AND v.status='open'
     ORDER BY a.risk_score DESC`,
    [tenantId, policyId]
  );
  return rows;
}

module.exports = {
  BUILTIN,
  ensurePolicies,
  listPolicies,
  runPolicy,
  remediateAll,
  policyAgents,
};
