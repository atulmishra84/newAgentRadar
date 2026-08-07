'use strict';

const express = require('express');
const {
  FIRST_WAVE_PROVIDERS,
  DEFAULT_RISK_WEIGHTS,
  POSITIONING,
  TAGLINE,
  CONNECTOR_PROVIDERS,
} = require('@agentradar/shared');
const { authenticate, requireWriteAccess, requireRoles, ROLES } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const db = require('../models/db');
const config = require('../config');

const router = express.Router();
router.use(authenticate, tenantScope);

router.get('/product', (req, res) => {
  res.json({
    tagline: TAGLINE,
    positioning: POSITIONING,
    positioning_long:
      'AgentRadar is the system of record for AI agents — discovering sanctioned and shadow agents across cloud, SaaS, healthcare, and endpoints so you can inventory, risk-score, and govern them.',
    first_wave: FIRST_WAVE_PROVIDERS,
    discovery_demo_mode: config.discoveryDemoMode,
    wedge: {
      title: '30-day land path',
      connectors: FIRST_WAVE_PROVIDERS,
      outcomes: [
        'Azure + EDR + GitHub discovery live or demo-labeled',
        'Shadow AI approve/quarantine with enforcement webhooks',
        'PHI/BAA gaps closed or risk-accepted with expiry',
        'CISO report + evidence package for board/audit',
      ],
    },
  });
});

router.get('/risk-weights', async (req, res) => {
  const { rows } = await db.query(`SELECT risk_weights FROM tenants WHERE id=$1`, [req.tenantId]);
  res.json({ weights: rows[0]?.risk_weights || DEFAULT_RISK_WEIGHTS, defaults: DEFAULT_RISK_WEIGHTS });
});

router.put('/risk-weights', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  const weights = { ...DEFAULT_RISK_WEIGHTS, ...(req.body?.weights || req.body || {}) };
  await db.query(`UPDATE tenants SET risk_weights=$1, updated_at=NOW() WHERE id=$2`, [
    JSON.stringify(weights),
    req.tenantId,
  ]);
  res.json({ weights });
});

router.get('/sso', async (req, res) => {
  const { rows } = await db.query(`SELECT sso_config FROM tenants WHERE id=$1`, [req.tenantId]);
  const mappings = await db.query(
    `SELECT * FROM sso_role_mappings WHERE tenant_id=$1 ORDER BY claim_value`,
    [req.tenantId]
  );
  res.json({
    config: rows[0]?.sso_config || {},
    mappings: mappings.rows,
    entra_configured: !!(config.entra.tenantId && config.entra.clientId && config.entra.clientSecret),
    mfa_required_roles: ['platform_admin', 'ciso'],
  });
});

router.put('/sso', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  await db.query(`UPDATE tenants SET sso_config=$1, updated_at=NOW() WHERE id=$2`, [
    JSON.stringify(req.body || {}),
    req.tenantId,
  ]);
  res.json({ config: req.body || {} });
});

router.post('/sso/mappings', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  const { claim_name = 'roles', claim_value, role } = req.body || {};
  if (!claim_value || !role) return res.status(400).json({ error: 'claim_value and role required' });
  const { rows } = await db.query(
    `INSERT INTO sso_role_mappings (tenant_id, claim_name, claim_value, role)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (tenant_id, claim_name, claim_value) DO UPDATE SET role=EXCLUDED.role
     RETURNING *`,
    [req.tenantId, claim_name, claim_value, role]
  );
  res.status(201).json({ mapping: rows[0] });
});

router.delete('/sso/mappings/:id', requireWriteAccess, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO), async (req, res) => {
  await db.query(`DELETE FROM sso_role_mappings WHERE tenant_id=$1 AND id=$2`, [
    req.tenantId,
    req.params.id,
  ]);
  res.json({ ok: true });
});

router.get('/wedge', (req, res) => {
  const providers = CONNECTOR_PROVIDERS.filter((p) => p.firstWave);
  res.json({
    providers,
    message: 'Start here: Azure, Entra SSO, CrowdStrike/Intune, GitHub, Epic — then expand.',
  });
});

module.exports = router;
