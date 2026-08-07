'use strict';

const { FRAMEWORKS } = require('@agentradar/shared');
const { listAgents } = require('./agents');

async function estateCompliance(tenantId) {
  const agents = await listAgents(tenantId);
  const frameworks = {};
  for (const fw of FRAMEWORKS) {
    frameworks[fw] = { pass: 0, fail: 0, warn: 0, total: agents.length, passPct: 0 };
  }
  for (const a of agents) {
    const scores = a.framework_scores || {};
    for (const fw of FRAMEWORKS) {
      const status = scores[fw]?.status || 'pass';
      if (status === 'fail') frameworks[fw].fail += 1;
      else if (status === 'warn') frameworks[fw].warn += 1;
      else frameworks[fw].pass += 1;
    }
  }
  for (const fw of FRAMEWORKS) {
    const f = frameworks[fw];
    f.passPct = f.total ? Math.round((f.pass / f.total) * 100) : 100;
  }
  return { frameworks, agentCount: agents.length };
}

module.exports = { estateCompliance, FRAMEWORKS };
