'use strict';

const db = require('../models/db');
const { updateAgent } = require('./agents');

async function listBaa(tenantId) {
  const { rows } = await db.query(
    `SELECT b.*, a.name AS agent_name, a.phi_flag, a.risk_score
     FROM baa_records b
     JOIN agents a ON a.id = b.agent_id
     WHERE b.tenant_id=$1
     ORDER BY b.updated_at DESC`,
    [tenantId]
  );
  return rows;
}

async function upsertBaa(tenantId, agentId, payload) {
  const { rows } = await db.query(
    `INSERT INTO baa_records (tenant_id, agent_id, status, signatory, signed_at, expires_at, document_url, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (tenant_id, agent_id) DO UPDATE SET
       status=EXCLUDED.status,
       signatory=EXCLUDED.signatory,
       signed_at=EXCLUDED.signed_at,
       expires_at=EXCLUDED.expires_at,
       document_url=EXCLUDED.document_url,
       notes=EXCLUDED.notes,
       updated_at=NOW()
     RETURNING *`,
    [
      tenantId,
      agentId,
      payload.status || 'pending',
      payload.signatory || null,
      payload.signed_at || null,
      payload.expires_at || null,
      payload.document_url || null,
      payload.notes || null,
    ]
  );
  await updateAgent(tenantId, agentId, { baa_status: rows[0].status });
  return rows[0];
}

async function phiExposure(tenantId) {
  const { rows } = await db.query(
    `SELECT a.*, b.status AS baa_record_status, b.signatory, b.expires_at, b.document_url
     FROM agents a
     LEFT JOIN baa_records b ON b.agent_id = a.id AND b.tenant_id = a.tenant_id
     WHERE a.tenant_id=$1 AND a.phi_flag = true
     ORDER BY a.risk_score DESC`,
    [tenantId]
  );
  return rows;
}

module.exports = { listBaa, upsertBaa, phiExposure };
