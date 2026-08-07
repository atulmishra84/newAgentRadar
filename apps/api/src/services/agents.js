'use strict';

const {
  scoreAgent,
  confidenceFromSources,
  buildFrameworkScores,
  agentFingerprint,
  DEFAULT_RISK_WEIGHTS,
} = require('@agentradar/shared');
const db = require('../models/db');

async function getTenantWeights(tenantId) {
  const { rows } = await db.query(`SELECT risk_weights FROM tenants WHERE id=$1`, [tenantId]);
  return rows[0]?.risk_weights || DEFAULT_RISK_WEIGHTS;
}

function recompute(agent, weights) {
  const framework_scores = buildFrameworkScores(agent);
  const scored = scoreAgent({ ...agent, framework_scores }, weights);
  const confidence = confidenceFromSources(agent.detection_sources);
  const fingerprint = agent.fingerprint || agentFingerprint(agent);
  return { ...scored, framework_scores, confidence, fingerprint };
}

async function listAgents(tenantId, filters = {}) {
  const clauses = ['tenant_id = $1'];
  const params = [tenantId];
  let i = 2;

  if (filters.shadow === true || filters.shadow === 'true') clauses.push('shadow = true');
  if (filters.phi === true || filters.phi === 'true') clauses.push('phi_flag = true');
  if (filters.category) { clauses.push(`category = $${i++}`); params.push(filters.category); }
  if (filters.lifecycle) { clauses.push(`lifecycle = $${i++}`); params.push(filters.lifecycle); }
  if (filters.risk_level) { clauses.push(`risk_level = $${i++}`); params.push(filters.risk_level); }
  if (filters.q) {
    clauses.push(`(name ILIKE $${i} OR owner ILIKE $${i} OR fingerprint ILIKE $${i})`);
    params.push(`%${filters.q}%`);
    i += 1;
  }
  if (filters.unowned === true || filters.unowned === 'true') {
    clauses.push("(owner IS NULL OR owner = '')");
  }
  if (filters.never_reviewed === true || filters.never_reviewed === 'true') {
    clauses.push('last_reviewed_at IS NULL');
  }

  const { rows } = await db.query(
    `SELECT * FROM agents WHERE ${clauses.join(' AND ')}
     ORDER BY risk_score DESC, name ASC`,
    params
  );
  return rows;
}

async function getAgent(tenantId, id) {
  const { rows } = await db.query(
    `SELECT * FROM agents WHERE tenant_id=$1 AND id=$2`,
    [tenantId, id]
  );
  return rows[0] || null;
}

async function updateAgent(tenantId, id, patch) {
  const agent = await getAgent(tenantId, id);
  if (!agent) return null;
  const weights = await getTenantWeights(tenantId);

  const fields = [
    'name', 'type', 'category', 'environment', 'version', 'hosting', 'model_ref',
    'shadow', 'phi_flag', 'pii_flag', 'lifecycle', 'owner', 'review_cadence_days',
    'last_reviewed_at', 'baa_status', 'detection_sources', 'data_stores', 'protocols',
    'metadata', 'tags', 'external_id', 'risk_accepted', 'risk_accepted_until',
    'risk_accepted_by', 'risk_accept_reason',
  ];

  for (const f of fields) {
    if (patch[f] !== undefined) agent[f] = patch[f];
  }

  const scores = recompute(agent, weights);
  Object.assign(agent, scores);

  await db.query(
    `UPDATE agents SET
      name=$1, type=$2, category=$3, environment=$4, version=$5, hosting=$6,
      model_ref=$7, shadow=$8, phi_flag=$9, pii_flag=$10, lifecycle=$11, owner=$12,
      review_cadence_days=$13, last_reviewed_at=$14, baa_status=$15,
      detection_sources=$16, data_stores=$17, protocols=$18, metadata=$19, tags=$20,
      risk_score=$21, risk_level=$22, risk_factors=$23, framework_scores=$24,
      confidence=$25, fingerprint=$26, external_id=$27,
      risk_accepted=$28, risk_accepted_until=$29, risk_accepted_by=$30, risk_accept_reason=$31,
      last_seen=COALESCE($32::timestamptz, last_seen), updated_at=NOW()
     WHERE id=$33 AND tenant_id=$34`,
    [
      agent.name, agent.type, agent.category, agent.environment, agent.version, agent.hosting,
      agent.model_ref, agent.shadow, agent.phi_flag, agent.pii_flag, agent.lifecycle, agent.owner,
      agent.review_cadence_days, agent.last_reviewed_at, agent.baa_status,
      JSON.stringify(agent.detection_sources || []),
      JSON.stringify(agent.data_stores || []),
      JSON.stringify(agent.protocols || []),
      JSON.stringify(agent.metadata || {}),
      JSON.stringify(agent.tags || {}),
      agent.risk_score, agent.risk_level,
      JSON.stringify(agent.risk_factors),
      JSON.stringify(agent.framework_scores),
      agent.confidence,
      agent.fingerprint,
      agent.external_id || null,
      !!agent.risk_accepted,
      agent.risk_accepted_until || null,
      agent.risk_accepted_by || null,
      agent.risk_accept_reason || null,
      patch.last_seen || null,
      id, tenantId,
    ]
  );
  return getAgent(tenantId, id);
}

async function upsertDiscovered(tenantId, payload) {
  const weights = await getTenantWeights(tenantId);
  const draft = {
    ...payload,
    detection_sources: payload.detection_sources || [],
    data_stores: payload.data_stores || [],
    protocols: payload.protocols || [],
    metadata: payload.metadata || {},
    tags: payload.tags || {},
    external_id: payload.external_id || payload.metadata?.azure_id || payload.metadata?.repo || null,
  };
  draft.fingerprint = agentFingerprint(draft);

  const byFp = await db.query(
    `SELECT * FROM agents WHERE tenant_id=$1 AND fingerprint=$2 LIMIT 1`,
    [tenantId, draft.fingerprint]
  );

  if (byFp.rows[0]) {
    const agent = byFp.rows[0];
    const sources = Array.from(
      new Set([...(agent.detection_sources || []), ...(draft.detection_sources || [])])
    );
    return updateAgent(tenantId, agent.id, {
      ...draft,
      detection_sources: sources,
      last_seen: new Date().toISOString(),
    });
  }

  // Legacy fallback
  const existing = await db.query(
    `SELECT * FROM agents WHERE tenant_id=$1 AND name=$2 AND category=$3 LIMIT 1`,
    [tenantId, draft.name, draft.category]
  );
  if (existing.rows[0]) {
    return updateAgent(tenantId, existing.rows[0].id, {
      ...draft,
      detection_sources: Array.from(
        new Set([...(existing.rows[0].detection_sources || []), ...draft.detection_sources])
      ),
      last_seen: new Date().toISOString(),
    });
  }

  const scores = recompute(draft, weights);
  const { rows } = await db.query(
    `INSERT INTO agents (
      tenant_id, name, type, category, environment, version, hosting, model_ref,
      shadow, phi_flag, pii_flag, lifecycle, owner, baa_status,
      detection_sources, data_stores, protocols, metadata, tags,
      risk_score, risk_level, risk_factors, framework_scores, confidence,
      fingerprint, external_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
    ) RETURNING *`,
    [
      tenantId,
      draft.name,
      draft.type || 'agent',
      draft.category || 'cloud',
      draft.environment || 'production',
      draft.version || null,
      draft.hosting || null,
      draft.model_ref || null,
      !!draft.shadow,
      !!draft.phi_flag,
      !!draft.pii_flag,
      draft.lifecycle || 'active',
      draft.owner || null,
      draft.baa_status || (draft.phi_flag ? 'missing' : 'na'),
      JSON.stringify(draft.detection_sources),
      JSON.stringify(draft.data_stores),
      JSON.stringify(draft.protocols),
      JSON.stringify(draft.metadata),
      JSON.stringify(draft.tags),
      scores.risk_score,
      scores.risk_level,
      JSON.stringify(scores.risk_factors),
      JSON.stringify(scores.framework_scores),
      scores.confidence,
      scores.fingerprint,
      draft.external_id,
    ]
  );

  await db.query(
    `INSERT INTO discovery_events (tenant_id, agent_id, event_type, detail)
     VALUES ($1,$2,'agent_discovered',$3)`,
    [tenantId, rows[0].id, JSON.stringify({ name: rows[0].name, fingerprint: rows[0].fingerprint })]
  );

  return rows[0];
}

async function evidencePackage(tenantId, id) {
  const agent = await getAgent(tenantId, id);
  if (!agent) return null;
  const baa = await db.query(
    `SELECT * FROM baa_records WHERE tenant_id=$1 AND agent_id=$2`,
    [tenantId, id]
  );
  const violations = await db.query(
    `SELECT pv.*, p.name AS policy_name FROM policy_violations pv
     JOIN policies p ON p.id = pv.policy_id
     WHERE pv.tenant_id=$1 AND pv.agent_id=$2`,
    [tenantId, id]
  );
  const acceptances = await db.query(
    `SELECT * FROM risk_acceptances WHERE tenant_id=$1 AND agent_id=$2 ORDER BY created_at DESC`,
    [tenantId, id]
  );
  return {
    generated_at: new Date().toISOString(),
    package_type: 'AgentRadar Evidence Package',
    frameworks_target: ['HIPAA', 'SOC2'],
    agent,
    fingerprint: agent.fingerprint,
    baa: baa.rows[0] || null,
    violations: violations.rows,
    risk_acceptances: acceptances.rows,
    frameworks: agent.framework_scores,
  };
}

async function estateEvidence(tenantId) {
  const agents = await listAgents(tenantId);
  const packages = [];
  for (const a of agents.slice(0, 200)) {
    packages.push(await evidencePackage(tenantId, a.id));
  }
  return {
    generated_at: new Date().toISOString(),
    package_type: 'AgentRadar Estate Evidence Export',
    positioning: 'Your CMDB for AI agents',
    agent_count: agents.length,
    packages,
  };
}

async function dashboardStats(tenantId) {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE shadow)::int AS shadow,
       COUNT(*) FILTER (WHERE phi_flag)::int AS phi,
       COUNT(*) FILTER (WHERE risk_level='critical')::int AS critical,
       COUNT(*) FILTER (WHERE risk_level='high')::int AS high,
       COUNT(*) FILTER (WHERE risk_level='medium')::int AS medium,
       COUNT(*) FILTER (WHERE risk_level='low')::int AS low,
       COALESCE(AVG(risk_score),0)::float AS avg_risk,
       COUNT(*) FILTER (WHERE owner IS NULL OR owner='')::int AS unowned,
       COUNT(*) FILTER (WHERE last_reviewed_at IS NULL)::int AS never_reviewed,
       COUNT(*) FILTER (WHERE phi_flag AND baa_status='missing')::int AS phi_no_baa,
       COUNT(*) FILTER (WHERE risk_accepted AND risk_accepted_until > NOW())::int AS risk_accepted
     FROM agents WHERE tenant_id=$1`,
    [tenantId]
  );
  return rows[0];
}

async function acceptRisk(tenantId, agentId, { reason, expires_at, userId }) {
  if (!reason || !expires_at) throw new Error('reason and expires_at required');
  await db.query(
    `INSERT INTO risk_acceptances (tenant_id, agent_id, accepted_by, reason, expires_at, status)
     VALUES ($1,$2,$3,$4,$5,'active')`,
    [tenantId, agentId, userId || null, reason, expires_at]
  );
  return updateAgent(tenantId, agentId, {
    risk_accepted: true,
    risk_accepted_until: expires_at,
    risk_accepted_by: userId || null,
    risk_accept_reason: reason,
  });
}

module.exports = {
  recompute,
  getTenantWeights,
  listAgents,
  getAgent,
  updateAgent,
  upsertDiscovered,
  evidencePackage,
  estateEvidence,
  dashboardStats,
  acceptRisk,
};
