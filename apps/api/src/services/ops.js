'use strict';

const { listAgents } = require('./agents');
const { listEvents } = require('./discovery');

async function opsQueue(tenantId) {
  const agents = await listAgents(tenantId);
  const events = await listEvents(tenantId, 30);

  return {
    shadow: agents.filter((a) => a.shadow && a.lifecycle !== 'approved' && a.lifecycle !== 'quarantined'),
    phi_missing_baa: agents.filter((a) => a.phi_flag && a.baa_status === 'missing'),
    unowned: agents.filter((a) => !a.owner),
    never_reviewed: agents.filter((a) => !a.last_reviewed_at),
    high_critical: agents.filter((a) => a.risk_level === 'high' || a.risk_level === 'critical'),
    events,
  };
}

module.exports = { opsQueue };
