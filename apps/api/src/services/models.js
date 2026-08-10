'use strict';

const db = require('../models/db');

const DEFAULT_MODELS = [
  { name: 'GPT-4o', vendor: 'OpenAI', hosting_type: 'cloud', baa_available: true, soc2: true, hipaa_capable: true },
  { name: 'Claude 3.5', vendor: 'Anthropic', hosting_type: 'cloud', baa_available: true, soc2: true, hipaa_capable: true },
  { name: 'Gemini', vendor: 'Google', hosting_type: 'cloud', baa_available: true, soc2: true, hipaa_capable: true },
  { name: 'Azure OpenAI', vendor: 'Microsoft', hosting_type: 'cloud', baa_available: true, soc2: true, hipaa_capable: true },
  { name: 'Llama 3', vendor: 'Meta', hosting_type: 'self_hosted', baa_available: false, soc2: false, hipaa_capable: false },
  { name: 'Mistral', vendor: 'Mistral AI', hosting_type: 'cloud', baa_available: false, soc2: true, hipaa_capable: false },
  { name: 'Ollama', vendor: 'Ollama', hosting_type: 'local', baa_available: false, soc2: false, hipaa_capable: false },
];

async function ensureModels(tenantId) {
  for (const m of DEFAULT_MODELS) {
    await db.query(
      `INSERT INTO models (tenant_id, name, vendor, hosting_type, baa_available, soc2, hipaa_capable)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, name) DO NOTHING`,
      [tenantId, m.name, m.vendor, m.hosting_type, m.baa_available, m.soc2, m.hipaa_capable]
    );
  }
}

async function listModels(tenantId) {
  await ensureModels(tenantId);
  const { rows } = await db.query(
    `SELECT m.*,
       (SELECT COUNT(*)::int FROM agents a
        WHERE a.tenant_id=m.tenant_id AND a.model_ref = m.name) AS agent_count
     FROM models m WHERE m.tenant_id=$1 ORDER BY m.name`,
    [tenantId]
  );
  return rows;
}

async function upsertModel(tenantId, payload) {
  const {
    name,
    vendor,
    hosting_type = 'cloud',
    baa_available = false,
    soc2 = false,
    hipaa_capable = false,
  } = payload || {};
  if (!name || !vendor) throw new Error('name and vendor required');
  const { rows } = await db.query(
    `INSERT INTO models (tenant_id, name, vendor, hosting_type, baa_available, soc2, hipaa_capable)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (tenant_id, name) DO UPDATE SET
       vendor=EXCLUDED.vendor,
       hosting_type=EXCLUDED.hosting_type,
       baa_available=EXCLUDED.baa_available,
       soc2=EXCLUDED.soc2,
       hipaa_capable=EXCLUDED.hipaa_capable
     RETURNING *`,
    [tenantId, name, vendor, hosting_type, !!baa_available, !!soc2, !!hipaa_capable]
  );
  return rows[0];
}

async function deleteModel(tenantId, id) {
  const { rowCount } = await db.query(`DELETE FROM models WHERE tenant_id=$1 AND id=$2`, [
    tenantId,
    id,
  ]);
  return rowCount > 0;
}

module.exports = { listModels, ensureModels, upsertModel, deleteModel, DEFAULT_MODELS };
