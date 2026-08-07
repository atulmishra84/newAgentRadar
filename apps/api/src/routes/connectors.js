'use strict';

const express = require('express');
const { CONNECTOR_PROVIDERS } = require('@agentradar/shared');
const { authenticate, requireWriteAccess, requireRoles, ROLES } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const db = require('../models/db');
const { encrypt } = require('../utils/crypto');
const { providerMeta, testConnector } = require('../connectors');
const discovery = require('../services/discovery');
const { logAudit } = require('../services/audit');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/providers', (req, res) => {
  const config = require('../config');
  res.json({
    providers: CONNECTOR_PROVIDERS.map((p) => ({
      ...p,
      modeDefault: config.discoveryDemoMode || !p.liveCapable ? 'demo' : 'live',
    })),
    discovery_demo_mode: config.discoveryDemoMode,
  });
});

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, provider, category, status, mode, first_wave, last_tested, last_scanned, agents_found, created_at, updated_at
     FROM connectors WHERE tenant_id=$1 ORDER BY first_wave DESC, name`,
    [req.tenantId]
  );
  res.json({ connectors: rows });
});

router.post('/', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO, ROLES.ANALYST), async (req, res) => {
  const { name, provider, credentials, mode } = req.body || {};
  const meta = providerMeta(provider);
  if (!name || !meta) return res.status(400).json({ error: 'name and valid provider required' });
  const config = require('../config');
  const resolvedMode =
    mode || (config.discoveryDemoMode || !meta.liveCapable ? 'demo' : 'live');

  let enc = { ciphertext: null, iv: null, authTag: null };
  if (credentials) {
    enc = encrypt(JSON.stringify(credentials));
  }

  const { rows } = await db.query(
    `INSERT INTO connectors (tenant_id, name, provider, category, status, mode, first_wave, ciphertext, iv, auth_tag)
     VALUES ($1,$2,$3,$4,'inactive',$5,$6,$7,$8,$9)
     RETURNING id, name, provider, category, status, mode, first_wave, last_tested, last_scanned, agents_found, created_at`,
    [
      req.tenantId,
      name,
      provider,
      meta.group,
      resolvedMode,
      !!meta.firstWave,
      enc.ciphertext,
      enc.iv,
      enc.authTag,
    ]
  );

  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'connector.create',
    detail: { id: rows[0].id, provider, mode: resolvedMode },
    req,
  });

  res.status(201).json({
    connector: rows[0],
    mode: resolvedMode,
    modeLabel: resolvedMode === 'live' ? 'Live API' : 'Demo / simulated scanner',
    hipaaNote: meta.hipaa
      ? 'Healthcare connector: ensure a Business Associate Agreement (BAA) is in place before scanning PHI systems.'
      : null,
  });
});

router.post('/:id/test', requireWriteAccess, async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM connectors WHERE tenant_id=$1 AND id=$2`, [
    req.tenantId,
    req.params.id,
  ]);
  const c = rows[0];
  if (!c) return res.status(404).json({ error: 'Not found' });

  let credentials = {};
  if (c.ciphertext) {
    const { decrypt } = require('../utils/crypto');
    credentials = JSON.parse(decrypt({ ciphertext: c.ciphertext, iv: c.iv, authTag: c.auth_tag }));
  }
  const result = await testConnector(c.provider, credentials);
  await db.query(
    `UPDATE connectors SET status=$1, last_tested=NOW(), updated_at=NOW() WHERE id=$2`,
    [result.ok ? 'active' : 'error', c.id]
  );
  res.json(result);
});

router.post('/:id/scan', requireWriteAccess, async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM connectors WHERE tenant_id=$1 AND id=$2`, [
    req.tenantId,
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  const result = await discovery.runConnectorScan(req.tenantId, rows[0], req.user, req);
  res.json(result);
});

router.delete('/:id', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  await db.query(`DELETE FROM connectors WHERE tenant_id=$1 AND id=$2`, [req.tenantId, req.params.id]);
  res.json({ ok: true });
});

router.post('/scan/category/:category', requireWriteAccess, async (req, res) => {
  const result = await discovery.scanByCategory(req.tenantId, req.params.category, req.user, req);
  res.json({ results: result });
});

router.post('/scan/all', requireWriteAccess, async (req, res) => {
  const result = await discovery.scanAll(req.tenantId, req.user, req);
  res.json({ results: result });
});

module.exports = router;
