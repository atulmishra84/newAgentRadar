'use strict';

const db = require('../models/db');
const { listAgents } = require('./agents');

async function analytics(tenantId) {
  const agents = await listAgents(tenantId);
  const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
  const byEnv = {};
  for (const a of agents) {
    distribution[a.risk_level] = (distribution[a.risk_level] || 0) + 1;
    const env = a.environment || 'unknown';
    if (!byEnv[env]) byEnv[env] = { critical: 0, high: 0, medium: 0, low: 0, total: 0, avg: 0, sum: 0 };
    byEnv[env][a.risk_level] += 1;
    byEnv[env].total += 1;
    byEnv[env].sum += a.risk_score;
  }
  for (const env of Object.keys(byEnv)) {
    byEnv[env].avg = byEnv[env].total ? Math.round(byEnv[env].sum / byEnv[env].total) : 0;
  }

  const top = [...agents].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10);
  const remediation = agents
    .filter((a) => a.risk_level === 'critical' || a.risk_level === 'high' || a.shadow || (a.phi_flag && a.baa_status === 'missing'))
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 25);

  const { rows: trend } = await db.query(
    `SELECT * FROM risk_snapshots WHERE tenant_id=$1
     AND captured_at >= NOW() - INTERVAL '7 days'
     ORDER BY captured_at ASC`,
    [tenantId]
  );

  return { distribution, byEnv, top, remediation, trend };
}

async function captureSnapshot(tenantId) {
  const stats = await db.query(
    `SELECT
       COUNT(*)::int AS total_agents,
       COALESCE(AVG(risk_score),0)::float AS avg_score,
       COUNT(*) FILTER (WHERE risk_level='critical')::int AS critical_count,
       COUNT(*) FILTER (WHERE risk_level='high')::int AS high_count,
       COUNT(*) FILTER (WHERE risk_level='medium')::int AS medium_count,
       COUNT(*) FILTER (WHERE risk_level='low')::int AS low_count
     FROM agents WHERE tenant_id=$1`,
    [tenantId]
  );
  const s = stats.rows[0];
  await db.query(
    `INSERT INTO risk_snapshots
     (tenant_id, avg_score, critical_count, high_count, medium_count, low_count, total_agents)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [tenantId, s.avg_score, s.critical_count, s.high_count, s.medium_count, s.low_count, s.total_agents]
  );
  return s;
}

module.exports = { analytics, captureSnapshot };
