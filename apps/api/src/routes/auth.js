'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const db = require('../models/db');
const {
  signToken,
  verifyToken,
  authenticate,
  MFA_REQUIRED_ROLES,
} = require('../middleware/auth');
const { rateLimitAuth, issueCsrfCookie } = require('../middleware/rateLimit');
const { logAudit } = require('../services/audit');
const { forwardToSiem } = require('../services/siem');
const mfa = require('../services/mfa');

const router = express.Router();

function issueSession(res, user) {
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
  return { token, csrfToken };
}

function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenant_id,
    tenantSlug: user.tenant_slug,
    mfa_enabled: !!user.mfa_enabled,
    platform_operator: !!user.platform_operator,
  };
}

async function resolveSsoRole(tenantId, claims) {
  const { rows } = await db.query(
    `SELECT claim_name, claim_value, role FROM sso_role_mappings WHERE tenant_id=$1 ORDER BY created_at`,
    [tenantId]
  );
  const bag = [];
  for (const [k, v] of Object.entries(claims || {})) {
    if (Array.isArray(v)) bag.push(...v.map((x) => ({ claim: k, value: String(x) })));
    else if (v != null) bag.push({ claim: k, value: String(v) });
  }
  for (const m of rows) {
    if (bag.some((b) => b.claim === m.claim_name && b.value === m.claim_value)) {
      return m.role;
    }
    // Also match roles/groups arrays regardless of claim_name aliasing
    if (
      (m.claim_name === 'roles' || m.claim_name === 'groups') &&
      bag.some((b) => (b.claim === 'roles' || b.claim === 'groups') && b.value === m.claim_value)
    ) {
      return m.role;
    }
  }
  return null;
}

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

    const mfaRequired = MFA_REQUIRED_ROLES.has(user.role);
    const enforceMfa = process.env.MFA_ENFORCE === 'true';

    if (user.mfa_enabled) {
      const challengeToken = signToken(
        { purpose: 'mfa_challenge', sub: user.id, email: user.email, tenantId: user.tenant_id },
        '10m'
      );
      return res.json({
        mfaChallenge: true,
        challengeToken,
        mfa: { required: true, enabled: true },
        positioning: 'Your CMDB for AI agents',
      });
    }

    if (enforceMfa && mfaRequired) {
      const enrollToken = signToken(
        { purpose: 'mfa_enroll', sub: user.id, email: user.email, tenantId: user.tenant_id, role: user.role },
        '15m'
      );
      return res.status(403).json({
        error: 'MFA enrollment required for this role',
        mfaEnrollRequired: true,
        enrollToken,
        mfa: { required: true, enabled: false, enroll: true },
      });
    }

    const { token, csrfToken } = issueSession(res, user);
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
      user: userPayload(user),
      mfa: { required: mfaRequired, enabled: false },
      positioning: 'Your CMDB for AI agents',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/mfa/verify-login', rateLimitAuth, async (req, res) => {
  try {
    const { challengeToken, code } = req.body || {};
    if (!challengeToken || !code) return res.status(400).json({ error: 'challengeToken and code required' });
    let payload;
    try {
      payload = verifyToken(challengeToken);
    } catch {
      return res.status(401).json({ error: 'Challenge expired' });
    }
    if (payload.purpose !== 'mfa_challenge') return res.status(400).json({ error: 'Invalid challenge' });
    const ok = await mfa.verifyUserCode(payload.sub, code);
    if (!ok) return res.status(401).json({ error: 'Invalid MFA code' });

    const { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug FROM users u
       JOIN tenants t ON t.id = u.tenant_id WHERE u.id=$1`,
      [payload.sub]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const { token, csrfToken } = issueSession(res, user);
    await db.query(`UPDATE users SET last_login=NOW() WHERE id=$1`, [user.id]);
    await logAudit({
      tenantId: user.tenant_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.mfa_login',
      req,
    });
    res.json({
      token,
      csrfToken,
      user: userPayload(user),
      mfa: { required: true, enabled: true },
      positioning: 'Your CMDB for AI agents',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

function identityFromRequest(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const jwtToken = bearer || req.cookies?.ar_token;
  if (!jwtToken) return null;
  try {
    const payload = verifyToken(jwtToken);
    if (payload.purpose) return null;
    return payload;
  } catch {
    return null;
  }
}

router.post('/mfa/enroll/start', async (req, res) => {
  try {
    let userId;
    let email;
    const session = identityFromRequest(req);
    if (session) {
      userId = session.sub;
      email = session.email;
    } else if (req.body?.enrollToken) {
      try {
        const payload = verifyToken(req.body.enrollToken);
        if (payload.purpose !== 'mfa_enroll') return res.status(400).json({ error: 'Invalid enroll token' });
        userId = payload.sub;
        email = payload.email;
      } catch {
        return res.status(401).json({ error: 'Enroll token expired' });
      }
    }
    if (!userId) return res.status(401).json({ error: 'Authentication or enrollToken required' });

    const result = await mfa.enrollStart({ id: userId, email });
    res.json({
      secret: result.secret,
      otpauth: result.otpauth,
      qrDataUrl: result.qrDataUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Enroll failed' });
  }
});

router.post('/mfa/enroll/confirm', async (req, res) => {
  try {
    const { code, enrollToken } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    let userId;
    let finishLogin = false;
    if (enrollToken) {
      try {
        const payload = verifyToken(enrollToken);
        if (payload.purpose !== 'mfa_enroll') return res.status(400).json({ error: 'Invalid enroll token' });
        userId = payload.sub;
        finishLogin = true;
      } catch {
        return res.status(401).json({ error: 'Enroll token expired' });
      }
    } else {
      const session = identityFromRequest(req);
      if (!session) return res.status(401).json({ error: 'Authentication required' });
      userId = session.sub;
    }
    await mfa.enrollConfirm(userId, code);
    const { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug FROM users u
       JOIN tenants t ON t.id = u.tenant_id WHERE u.id=$1`,
      [userId]
    );
    const user = rows[0];
    await logAudit({
      tenantId: user.tenant_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.mfa_enroll',
      req,
    });
    if (finishLogin) {
      const { token, csrfToken } = issueSession(res, user);
      await db.query(`UPDATE users SET last_login=NOW() WHERE id=$1`, [user.id]);
      return res.json({
        ok: true,
        token,
        csrfToken,
        user: userPayload(user),
        mfa: { required: true, enabled: true },
      });
    }
    res.json({ ok: true, mfa: { enabled: true } });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Confirm failed' });
  }
});

router.post('/mfa/disable', authenticate, async (req, res) => {
  const { code } = req.body || {};
  if (code) {
    const ok = await mfa.verifyUserCode(req.user.sub, code);
    if (!ok) return res.status(401).json({ error: 'Invalid MFA code' });
  }
  await mfa.disable(req.user.sub);
  await logAudit({
    tenantId: req.user.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'auth.mfa_disable',
    req,
  });
  res.json({ ok: true });
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
    `SELECT id, email, name, role, tenant_id, mfa_enabled, platform_operator FROM users WHERE id=$1`,
    [req.user.sub]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  const t = await db.query(`SELECT slug FROM tenants WHERE id=$1`, [rows[0].tenant_id]);
  res.json({
    user: {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role,
      tenantId: rows[0].tenant_id,
      tenantSlug: t.rows[0]?.slug,
      mfa_enabled: !!rows[0].mfa_enabled,
      platform_operator: !!rows[0].platform_operator,
    },
    positioning: 'Your CMDB for AI agents',
  });
});

router.get('/entra/status', (req, res) => {
  const configured = !!(config.entra.tenantId && config.entra.clientId && config.entra.clientSecret);
  res.json({ configured, redirectUri: config.entra.redirectUri });
});

const samlSvc = require('../services/saml');

router.get('/saml/status', async (req, res) => {
  const tenant = await db.query(`SELECT sso_config FROM tenants ORDER BY created_at ASC LIMIT 1`);
  const sso = tenant.rows[0]?.sso_config || {};
  const idp = sso.saml || {};
  res.json({
    configured: !!(idp.ssoUrl || process.env.SAML_IDP_SSO_URL),
    planned: false,
    message: 'SAML 2.0 SP metadata + ACS are live. Configure IdP SSO URL in tenant SSO settings or SAML_IDP_SSO_URL.',
    acsUrl: samlSvc.resolveAcsUrl(),
    entityId: samlSvc.spEntityId(),
    metadataUrl: `${config.appUrl.replace(/\/$/, '').includes('5173') ? `http://localhost:${config.port}` : config.appUrl.replace(/\/$/, '')}/api/auth/saml/metadata`,
  });
});

router.get('/saml/metadata', (req, res) => {
  res.type('application/samlmetadata+xml').send(samlSvc.metadataXml());
});

router.get('/saml/login', async (req, res) => {
  const tenant = await db.query(`SELECT sso_config FROM tenants ORDER BY created_at ASC LIMIT 1`);
  const idpSso = tenant.rows[0]?.sso_config?.saml?.ssoUrl || process.env.SAML_IDP_SSO_URL;
  if (!idpSso) {
    return res.status(501).json({
      error: 'SAML IdP SSO URL not configured',
      hint: 'Set tenants.sso_config.saml.ssoUrl or SAML_IDP_SSO_URL',
      metadataUrl: '/api/auth/saml/metadata',
    });
  }
  const { redirectUrl } = samlSvc.buildAuthnRequest(idpSso);
  res.json({ url: redirectUrl });
});

router.post('/saml/acs', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const parsed = samlSvc.parseSamlResponse(req.body?.SAMLResponse);
    if (!parsed.email) return res.status(400).send('No email in SAML assertion');

    const claims = {
      email: parsed.email,
      name: parsed.name,
      roles: parsed.attrs.roles || [],
      ...parsed.attrs,
    };

    const { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug, t.sso_config FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE lower(u.email)=lower($1) LIMIT 1`,
      [parsed.email]
    );
    let user = rows[0];
    const tenantRow = user
      ? { id: user.tenant_id, slug: user.tenant_slug, sso_config: user.sso_config }
      : (await db.query(`SELECT id, slug, sso_config FROM tenants ORDER BY created_at ASC LIMIT 1`)).rows[0];
    if (!tenantRow) return res.status(500).send('No tenant');

    const mappedRole = await resolveSsoRole(tenantRow.id, claims);
    const ssoConfig = tenantRow.sso_config || {};
    const defaultRole = ssoConfig.default_role || 'viewer';
    const jit = ssoConfig.jit_provision !== false;

    if (!user) {
      if (!jit) return res.status(403).send('JIT provisioning disabled');
      const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const created = await db.query(
        `INSERT INTO users (tenant_id, email, name, role, password_hash)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [tenantRow.id, parsed.email, parsed.name || parsed.email, mappedRole || defaultRole, hash]
      );
      user = { ...created.rows[0], tenant_slug: tenantRow.slug };
    } else if (mappedRole && mappedRole !== user.role) {
      const updated = await db.query(
        `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
        [mappedRole, user.id]
      );
      user = { ...updated.rows[0], tenant_slug: user.tenant_slug || tenantRow.slug };
    }

    issueSession(res, user);
    await db.query(`UPDATE users SET last_login=NOW() WHERE id=$1`, [user.id]);
    await logAudit({
      tenantId: user.tenant_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.saml_login',
      detail: { role: user.role, mappedRole, demo: !!parsed.demo },
      req,
    });
    res.redirect(`${config.appUrl}/`);
  } catch (err) {
    console.error(err);
    res.status(400).send(`SAML ACS failed: ${err.message}`);
  }
});

/** Dev helper: issue session from JSON assertion (non-production or SAML_DEV_LOGIN=true) */
router.post('/saml/dev-login', async (req, res) => {
  if (config.env === 'production' && process.env.SAML_DEV_LOGIN !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const assertion = Buffer.from(JSON.stringify(req.body || {}), 'utf8').toString('base64');
    const parsed = samlSvc.parseSamlResponse(assertion);
    if (!parsed.email) return res.status(400).json({ error: 'email required' });
    const claims = { email: parsed.email, name: parsed.name, roles: parsed.attrs.roles || [] };
    const tenantRow = (await db.query(`SELECT id, slug, sso_config FROM tenants ORDER BY created_at ASC LIMIT 1`)).rows[0];
    if (!tenantRow) return res.status(500).json({ error: 'No tenant' });
    const mappedRole = await resolveSsoRole(tenantRow.id, claims);
    let { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug FROM users u JOIN tenants t ON t.id=u.tenant_id WHERE lower(u.email)=lower($1) LIMIT 1`,
      [parsed.email]
    );
    let user = rows[0];
    if (!user) {
      const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const created = await db.query(
        `INSERT INTO users (tenant_id, email, name, role, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [tenantRow.id, parsed.email, parsed.name || parsed.email, mappedRole || 'viewer', hash]
      );
      user = { ...created.rows[0], tenant_slug: tenantRow.slug };
    }
    const { token, csrfToken } = issueSession(res, user);
    res.json({ token, csrfToken, user: userPayload(user), saml: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/entra/login', async (req, res) => {
  if (!config.entra.tenantId || !config.entra.clientId) {
    return res.status(501).json({
      error: 'Entra SSO not configured. Set ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET.',
    });
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
    if (!email) return res.status(400).send('No email claim');

    const { rows } = await db.query(
      `SELECT u.*, t.slug AS tenant_slug, t.sso_config FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       WHERE lower(u.email)=lower($1) LIMIT 1`,
      [email]
    );
    let user = rows[0];
    const tenantRow = user
      ? { id: user.tenant_id, slug: user.tenant_slug, sso_config: user.sso_config }
      : (await db.query(`SELECT id, slug, sso_config FROM tenants ORDER BY created_at ASC LIMIT 1`)).rows[0];

    if (!tenantRow) return res.status(500).send('No tenant');

    const mappedRole = await resolveSsoRole(tenantRow.id, claims);
    const ssoConfig = tenantRow.sso_config || {};
    const defaultRole = ssoConfig.default_role || 'viewer';
    const jit = ssoConfig.jit_provision !== false;

    if (!user) {
      if (!jit) return res.status(403).send('JIT provisioning disabled');
      const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const created = await db.query(
        `INSERT INTO users (tenant_id, email, name, role, password_hash)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [tenantRow.id, email, claims.name || email, mappedRole || defaultRole, hash]
      );
      user = { ...created.rows[0], tenant_slug: tenantRow.slug };
    } else if (mappedRole && mappedRole !== user.role) {
      const updated = await db.query(
        `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
        [mappedRole, user.id]
      );
      user = { ...updated.rows[0], tenant_slug: user.tenant_slug || tenantRow.slug };
    }

    const { token } = issueSession(res, user);
    await db.query(`UPDATE users SET last_login=NOW() WHERE id=$1`, [user.id]);
    await logAudit({
      tenantId: user.tenant_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth.entra_login',
      detail: { role: user.role, mappedRole },
      req,
    });
    void token;
    res.redirect(`${config.appUrl}/`);
  } catch (err) {
    console.error(err);
    res.status(500).send('SSO callback failed');
  }
});

module.exports = router;
