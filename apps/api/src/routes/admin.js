'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, requireRoles, ROLES } = require('../middleware/auth');
const { tenantScope } = require('../middleware/tenant');
const db = require('../models/db');
const { logAudit } = require('../services/audit');

const router = express.Router();
router.use(authenticate, tenantScope, requireRoles(ROLES.PLATFORM_ADMIN, ROLES.CISO));

router.get('/users', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, email, name, role, mfa_enabled, last_login, created_at
     FROM users WHERE tenant_id=$1 ORDER BY email`,
    [req.tenantId]
  );
  res.json({ users: rows });
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body || {};
  const allowed = Object.values(ROLES);
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const { rows } = await db.query(
    `UPDATE users SET role=$1, updated_at=NOW() WHERE tenant_id=$2 AND id=$3
     RETURNING id, email, name, role`,
    [role, req.tenantId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'admin.role_change',
    detail: { userId: rows[0].id, role },
    req,
  });
  res.json({ user: rows[0] });
});

router.post('/users', async (req, res) => {
  const { email, name, role, password } = req.body || {};
  if (!email || !name || !password) return res.status(400).json({ error: 'email, name, password required' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (tenant_id, email, name, role, password_hash)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, email, name, role, created_at`,
    [req.tenantId, email, name, role || 'analyst', hash]
  );
  await logAudit({
    tenantId: req.tenantId,
    actorId: req.user.sub,
    actorEmail: req.user.email,
    action: 'admin.user_create',
    detail: { userId: rows[0].id, email, role: rows[0].role },
    req,
  });
  res.status(201).json({ user: rows[0] });
});

module.exports = router;
