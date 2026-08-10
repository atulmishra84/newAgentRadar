'use strict';

const config = require('../config');
const db = require('../models/db');
const discovery = require('./discovery');

let timer = null;

async function runDiscoveryTick() {
  try {
    const { rows } = await db.query(`SELECT id FROM tenants ORDER BY created_at ASC`);
    for (const t of rows) {
      const results = await discovery.scanAll(t.id, { email: 'scheduler@agentradar' }, null);
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'scheduled_discovery',
          tenantId: t.id,
          jobs: results.length,
        })
      );
    }
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', msg: 'scheduled_discovery_failed', error: err.message }));
  }
}

function startScheduler() {
  const ms = parseInt(process.env.DISCOVERY_INTERVAL_MS || '0', 10);
  if (!ms || ms < 60000) return;
  if (timer) clearInterval(timer);
  timer = setInterval(runDiscoveryTick, ms);
  console.log(`Discovery scheduler enabled every ${ms}ms (demoMode=${config.discoveryDemoMode})`);
}

module.exports = { startScheduler, runDiscoveryTick };
