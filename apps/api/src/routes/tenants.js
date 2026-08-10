'use strict';

const express = require('express');
const {
  authenticate,
  requireRoles,
  ROLES,
  signToken,
} = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const tenants = require('../services/tenants');
const { logAudit } = require('../services/audit');
const config = require('../config');
const { issueCsrfCookie } = require('../middleware/rateLimit');
const db = require('../models/db');

const router = express.Router();

async function requireOperator(req, res, next) {
  const { rows } = await db.query(`SELECT platform_operator FROM users WHERE id=$1`, [req.user.sub]);
  if (!rows[0]?.platform_operator && req.user.role !== ROLES.PLATFORM_ADMIN) {
    return res.status(403).json({ error: 'Platform operator required' });
  }
  // platform_admin of a tenant can manage control plane if flagged operator OR sole operator path
  if (!rows[0]?.platform_operator) {
    return res.status(403).json({ error: 'Platform operator flag required' });
  }
  next();
}

router.use(authenticate);

router.get('/mine', async (req, res) => {
  const memberships = await tenants.listMembershipsForEmail(req.user.email);
  res.json({ memberships, currentTenantId: req.user.tenantId });
});

router.post('/switch/:tenantId', async (req, res) => {
  const memberships = await tenants.listMembershipsForEmail(req.user.email);
  const target = memberships.find((m) => m.tenant_id === req.params.tenantId);
  if (!target) return res.status(403).json({ error: 'No membership in that tenant' });
  if (target.status !== 'active') return res.status(403).json({ error: 'Tenant not active' });

  const user = await tenants.findUserInTenant(req.user.email, target.tenant_id);
  const token = signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenant_id,
    tenantSlug: user.tenant_slug,
  });
  res.cookie('ar_token', token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSecure ? 'strict' : 'lax',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
  const csrfToken = issueCsrfCookie(res);
  await logAudit({
    tenantId: user.tenant_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'tenant.switch',
    detail: { from: req.user.tenantId, to: user.tenant_id },
    req,
  });
  res.json({
    token,
    csrfToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id,
      tenantSlug: user.tenant_slug,
      mfa_enabled: !!user.mfa_enabled,
      platform_operator: !!user.platform_operator,
    },
  });
});

router.get('/', requireOperator, async (req, res) => {
  res.json({ tenants: await tenants.listTenants() });
});

router.post('/', requireOperator, async (req, res) => {
  try {
    const created = await tenants.createTenant(req.body || {});
    await logAudit({
      tenantId: created.tenant.id,
      actorId: req.user.sub,
      actorEmail: req.user.email,
      action: 'tenant.create',
      detail: { slug: created.tenant.slug },
      req,
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/status', requireOperator, async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const tenant = await tenants.updateTenantStatus(req.params.id, status);
  if (!tenant) return res.status(404).json({ error: 'Not found' });
  res.json({ tenant });
});

router.post('/:id/grant-me', requireOperator, tenantScope, async (req, res) => {
  const user = await tenants.ensureMembership(req.user.email, req.params.id, {
    name: req.user.name,
    role: 'platform_admin',
  });
  res.status(201).json({ user: { id: user.id, email: user.email, tenant_id: user.tenant_id } });
});

module.exports = router;
