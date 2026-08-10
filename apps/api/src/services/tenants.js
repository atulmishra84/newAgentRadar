'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../models/db');

async function listTenants() {
  const { rows } = await db.query(
    `SELECT t.*,
       (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id=t.id) AS user_count,
       (SELECT COUNT(*)::int FROM agents a WHERE a.tenant_id=t.id) AS agent_count
     FROM tenants t ORDER BY t.created_at ASC`
  );
  return rows;
}

async function getTenant(id) {
  const { rows } = await db.query(`SELECT * FROM tenants WHERE id=$1`, [id]);
  return rows[0] || null;
}

async function createTenant({ name, slug, adminEmail, adminName, adminPassword }) {
  if (!name || !slug || !adminEmail || !adminPassword) {
    throw new Error('name, slug, adminEmail, adminPassword required');
  }
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return db.withTransaction(async (client) => {
    const t = await client.query(
      `INSERT INTO tenants (name, slug, status) VALUES ($1,$2,'active') RETURNING *`,
      [name, cleanSlug]
    );
    const hash = await bcrypt.hash(adminPassword, 10);
    const u = await client.query(
      `INSERT INTO users (tenant_id, email, name, role, password_hash, platform_operator)
       VALUES ($1,$2,$3,'platform_admin',$4,false) RETURNING id, email, name, role, tenant_id`,
      [t.rows[0].id, adminEmail, adminName || adminEmail, hash]
    );
    return { tenant: t.rows[0], admin: u.rows[0] };
  });
}

async function updateTenantStatus(id, status) {
  const { rows } = await db.query(
    `UPDATE tenants SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

async function findUserInTenant(email, tenantId) {
  const { rows } = await db.query(
    `SELECT u.*, t.slug AS tenant_slug FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE lower(u.email)=lower($1) AND u.tenant_id=$2 LIMIT 1`,
    [email, tenantId]
  );
  return rows[0] || null;
}

async function listMembershipsForEmail(email) {
  const { rows } = await db.query(
    `SELECT u.id AS user_id, u.role, u.platform_operator, t.id AS tenant_id, t.name, t.slug, t.status
     FROM users u JOIN tenants t ON t.id = u.tenant_id
     WHERE lower(u.email)=lower($1) ORDER BY t.name`,
    [email]
  );
  return rows;
}

async function ensureMembership(email, tenantId, { name, role = 'viewer' } = {}) {
  const existing = await findUserInTenant(email, tenantId);
  if (existing) return existing;
  const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  const { rows } = await db.query(
    `INSERT INTO users (tenant_id, email, name, role, password_hash)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [tenantId, email, name || email, role, hash]
  );
  const t = await getTenant(tenantId);
  return { ...rows[0], tenant_slug: t.slug };
}

module.exports = {
  listTenants,
  getTenant,
  createTenant,
  updateTenantStatus,
  findUserInTenant,
  listMembershipsForEmail,
  ensureMembership,
};
