'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../models/db');
const { signToken, authenticate } = require('../middleware/auth');
const { rateLimitAuth, issueCsrfCookie } = require('../middleware/rateLimit');
const { logAudit } = require('../services/audit');
const { forwardToSiem } = require('../services/siem');

const router = express.Router();

router.get('/csrf', (req, res) => {
  const token = issueCsrfCookie(res);
  res.json({ csrfToken: token });
});

router.post('/login', rateLimitAuth, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE lower(u.email)=lower($1) LIMIT 1`,
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const mfaRequiredRoles = new Set(['platform_admin', 'ciso']);
    const mfaRequired = mfaRequiredRoles.has(user.role);
    const enforceMfa = process.env.MFA_ENFORCE === 'true';
    if (enforceMfa && mfaRequired && !user.mfa_enabled) {
      return res.status(403).json({
        error: 'MFA enrollment required for this role',
        mfa: { required: true, enabled: false, enroll: true },
      });
    }

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

    await db.query(`UPDATE users SET last_login=NOW() WHERE id=$1`, [user.id]);
    await logAudit({
      tenantId: user.tenant_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.login',
      detail: { role: user.role },
      req,
    });
    await forwardToSiem({ action: 'auth.login', email: user.email, tenantId: user.tenant_id });

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
      },
      mfa: { required: mfaRequired, enabled: !!user.mfa_enabled },
      positioning: 'Your CMDB for AI agents',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  res.clearCookie('ar_token', { path: '/' });
  await logAudit({
    tenantId: req.user.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'auth.logout',
    req,
  });
  res.json({ ok: true });
});

router.get('/me', authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, email, name, role, tenant_id, mfa_enabled FROM users WHERE id=$1`,
    [req.user.sub]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json({
    user: {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role,
      tenantId: rows[0].tenant_id,
      mfa_enabled: !!rows[0].mfa_enabled,
    },
    positioning: 'Your CMDB for AI agents',
  });
});

// Entra OIDC — configured in Phase 5; returns setup status when not configured
router.get('/entra/status', (req, res) => {
  const configured = !!(config.entra.tenantId && config.entra.clientId && config.entra.clientSecret);
  res.json({ configured, redirectUri: config.entra.redirectUri });
});

router.get('/entra/login', async (req, res) => {
  if (!config.entra.tenantId || !config.entra.clientId) {
    return res.status(501).json({ error: 'Entra SSO not configured. Set ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET.' });
  }
  try {
    const { Issuer } = require('openid-client');
    const issuer = await Issuer.discover(
      `https://login.microsoftonline.com/${config.entra.tenantId}/v2.0`
    );
    const client = new issuer.Client({
      client_id: config.entra.clientId,
      client_secret: config.entra.clientSecret,
      redirect_uris: [config.entra.redirectUri],
      response_types: ['code'],
    });
    const url = client.authorizationUrl({
      scope: 'openid email profile',
      response_mode: 'query',
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/entra/callback', async (req, res) => {
  if (!config.entra.tenantId || !config.entra.clientId) {
    return res.status(501).send('Entra SSO not configured');
  }
  try {
    const { Issuer } = require('openid-client');
    const issuer = await Issuer.discover(
      `https://login.microsoftonline.com/${config.entra.tenantId}/v2.0`
    );
    const client = new issuer.Client({
      client_id: config.entra.clientId,
      client_secret: config.entra.clientSecret,
      redirect_uris: [config.entra.redirectUri],
      response_types: ['code'],
    });
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(config.entra.redirectUri, params);
    const claims = tokenSet.claims();
    const email = claims.email || claims.preferred_username;
    const { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE lower(u.email)=lower($1) LIMIT 1`,
      [email]
    );
    let user = rows[0];
    if (!user) {
      // JIT provision as viewer into first tenant
      const tenant = await db.query(`SELECT id, slug FROM tenants ORDER BY created_at ASC LIMIT 1`);
      if (!tenant.rows[0]) return res.status(500).send('No tenant');
      const hash = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 10);
      const created = await db.query(
        `INSERT INTO users (tenant_id, email, name, role, password_hash)
         VALUES ($1,$2,$3,'viewer',$4) RETURNING *`,
        [tenant.rows[0].id, email, claims.name || email, hash]
      );
      user = { ...created.rows[0], tenant_slug: tenant.rows[0].slug };
    }
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
    issueCsrfCookie(res);
    res.redirect(`${config.appUrl}/`);
  } catch (err) {
    console.error(err);
    res.status(500).send('SSO callback failed');
  }
});

module.exports = router;
