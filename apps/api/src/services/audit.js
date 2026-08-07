'use strict';

const db = require('../models/db');

async function logAudit({ tenantId, actorId, actorEmail, action, detail = {}, req }) {
  await db.query(
    `INSERT INTO admin_audit_log (tenant_id, actor_id, actor_email, action, detail, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      tenantId || null,
      actorId || null,
      actorEmail || null,
      action,
      JSON.stringify(detail),
      req?.ip || null,
      req?.headers?.['user-agent'] || null,
    ]
  );
}

async function listAudit(tenantId, { limit = 100, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT * FROM admin_audit_log WHERE tenant_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );
  return rows;
}

module.exports = { logAudit, listAudit };
