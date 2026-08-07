'use strict';

const { CONNECTOR_PROVIDERS } = require('@agentradar/shared');
const db = require('../models/db');
const { ensureRedis } = require('../models/redis');
const { decrypt } = require('../utils/crypto');
const { scanProvider } = require('../connectors');
const { upsertDiscovered } = require('./agents');
const { logAudit } = require('./audit');

async function setScanState(tenantId, state) {
  try {
    const redis = await ensureRedis();
    await redis.set(`scan:${tenantId}`, JSON.stringify(state), 'EX', 3600);
  } catch {
    /* ignore */
  }
}

async function getScanState(tenantId) {
  try {
    const redis = await ensureRedis();
    const raw = await redis.get(`scan:${tenantId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function runConnectorScan(tenantId, connector, user, req) {
  const scanIns = await db.query(
    `INSERT INTO discovery_scans (tenant_id, connector_id, category, status, triggered_by)
     VALUES ($1,$2,$3,'running',$4) RETURNING *`,
    [tenantId, connector.id, connector.category, user?.sub || null]
  );
  const scan = scanIns.rows[0];
  await setScanState(tenantId, { status: 'running', connector: connector.provider, scanId: scan.id });

  try {
    let credentials = {};
    if (connector.ciphertext) {
      const raw = decrypt({
        ciphertext: connector.ciphertext,
        iv: connector.iv,
        authTag: connector.auth_tag,
      });
      credentials = JSON.parse(raw);
    }

    const found = await scanProvider(connector.provider, credentials);
    let count = 0;
    for (const payload of found) {
      await upsertDiscovered(tenantId, payload);
      count += 1;
    }

    await db.query(
      `UPDATE discovery_scans SET status='complete', agents_found=$1, finished_at=NOW() WHERE id=$2`,
      [count, scan.id]
    );
    await db.query(
      `UPDATE connectors SET status='active', last_scanned=NOW(), agents_found=$1, updated_at=NOW() WHERE id=$2`,
      [count, connector.id]
    );
    await setScanState(tenantId, { status: 'complete', connector: connector.provider, agents_found: count });

    await logAudit({
      tenantId,
      actorId: user?.sub,
      actorEmail: user?.email,
      action: 'discovery.scan',
      detail: { provider: connector.provider, agents_found: count },
      req,
    });

    return { scanId: scan.id, agents_found: count };
  } catch (err) {
    await db.query(
      `UPDATE discovery_scans SET status='error', error=$1, finished_at=NOW() WHERE id=$2`,
      [err.message, scan.id]
    );
    await db.query(
      `UPDATE connectors SET status='error', updated_at=NOW() WHERE id=$1`,
      [connector.id]
    );
    await setScanState(tenantId, { status: 'error', error: err.message });
    throw err;
  }
}

async function scanByCategory(tenantId, category, user, req) {
  const { rows } = await db.query(
    `SELECT * FROM connectors WHERE tenant_id=$1 AND category=$2`,
    [tenantId, category]
  );
  const results = [];
  for (const c of rows) {
    results.push(await runConnectorScan(tenantId, c, user, req));
  }
  return results;
}

async function scanAll(tenantId, user, req) {
  const { rows } = await db.query(`SELECT * FROM connectors WHERE tenant_id=$1`, [tenantId]);
  const results = [];
  for (const c of rows) {
    results.push(await runConnectorScan(tenantId, c, user, req));
  }
  // If no connectors configured, run demo scans for all provider groups
  if (!rows.length) {
    for (const p of CONNECTOR_PROVIDERS) {
      const found = await scanProvider(p.id, {});
      for (const payload of found) await upsertDiscovered(tenantId, payload);
      results.push({ provider: p.id, agents_found: found.length, demo: true });
    }
  }
  return results;
}

async function coverage(tenantId) {
  const { rows: connectors } = await db.query(
    `SELECT provider, category, status, mode, first_wave, agents_found, last_scanned, name FROM connectors WHERE tenant_id=$1`,
    [tenantId]
  );
  const connected = new Set(connectors.filter((c) => c.status === 'active').map((c) => c.provider));
  const sources = CONNECTOR_PROVIDERS.map((p) => {
    const c = connectors.find((x) => x.provider === p.id);
    return {
      ...p,
      connected: connected.has(p.id) || (c && c.status === 'active'),
      status: c?.status || 'blind',
      mode: c?.mode || (p.liveCapable ? 'live' : 'demo'),
      agents_found: c?.agents_found || 0,
      last_scanned: c?.last_scanned || null,
      connector_name: c?.name || null,
    };
  });
  const coveragePct = Math.round((sources.filter((s) => s.connected).length / sources.length) * 100);
  const firstWave = sources.filter((s) => s.firstWave);
  const firstWavePct = Math.round((firstWave.filter((s) => s.connected).length / Math.max(firstWave.length, 1)) * 100);
  return {
    coveragePct,
    firstWavePct,
    sources,
    connected: sources.filter((s) => s.connected).length,
    blind: sources.filter((s) => !s.connected).length,
    firstWaveBlind: firstWave.filter((s) => !s.connected),
  };
}

async function listEvents(tenantId, limit = 50) {
  const { rows } = await db.query(
    `SELECT * FROM discovery_events WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit]
  );
  return rows;
}

module.exports = {
  runConnectorScan,
  scanByCategory,
  scanAll,
  coverage,
  listEvents,
  getScanState,
};
