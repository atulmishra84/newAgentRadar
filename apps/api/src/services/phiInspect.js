'use strict';

const db = require('../models/db');

/** Metadata/content patterns — does not open EHR patient records */
const PATTERNS = [
  { code: 'ssn_like', re: /\b\d{3}-\d{2}-\d{4}\b/, weight: 25, detail: 'SSN-like identifier in agent metadata' },
  { code: 'mrn_like', re: /\b(mrn|medical[\s_-]?record)[:\s#-]*[A-Z0-9-]{4,}\b/i, weight: 20, detail: 'MRN-like identifier' },
  { code: 'npi_like', re: /\b\d{10}\b/, weight: 8, detail: 'Possible NPI / 10-digit clinical ID' },
  { code: 'phi_keyword', re: /\b(patient|phi|ephi|hipaa|diagnosis|encounter|fhir\/Patient|clarity)\b/i, weight: 12, detail: 'PHI-related keyword' },
  { code: 'clinical_store', re: /\b(epic|cerner|meditech|fhir|dicom|hl7)\b/i, weight: 10, detail: 'Clinical system / store reference' },
  { code: 'dob_like', re: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/, weight: 15, detail: 'Date-of-birth-like value' },
  { code: 'email_health', re: /\b[A-Z0-9._%+-]+@(patient|health|clinic|hospital)\./i, weight: 10, detail: 'Healthcare-domain email' },
];

function corpusFromAgent(agent) {
  const parts = [
    agent.name,
    agent.hosting,
    agent.model_ref,
    agent.owner,
    agent.environment,
    JSON.stringify(agent.data_stores || []),
    JSON.stringify(agent.protocols || []),
    JSON.stringify(agent.metadata || {}),
    JSON.stringify(agent.tags || {}),
    JSON.stringify(agent.detection_sources || []),
  ];
  return parts.filter(Boolean).join('\n');
}

function inspectText(text) {
  const findings = [];
  for (const p of PATTERNS) {
    if (p.re.test(text || '')) {
      findings.push({ code: p.code, weight: p.weight, detail: p.detail });
    }
  }
  // Deduplicate by code
  const seen = new Set();
  return findings.filter((f) => (seen.has(f.code) ? false : seen.add(f.code)));
}

function inspectAgent(agent) {
  const findings = inspectText(corpusFromAgent(agent));
  const score = findings.reduce((s, f) => s + f.weight, 0);
  const phiLikely = findings.some((f) =>
    ['ssn_like', 'mrn_like', 'phi_keyword', 'clinical_store'].includes(f.code)
  );
  return {
    findings,
    score,
    phi_flag_recommended: phiLikely || score >= 20,
    inspected_at: new Date().toISOString(),
  };
}

async function inspectAndPersist(tenantId, agentId) {
  const { rows } = await db.query(`SELECT * FROM agents WHERE tenant_id=$1 AND id=$2`, [
    tenantId,
    agentId,
  ]);
  const agent = rows[0];
  if (!agent) return null;
  const result = inspectAgent(agent);
  const phi_flag = agent.phi_flag || result.phi_flag_recommended;
  await db.query(
    `UPDATE agents SET
       phi_findings=$1, phi_inspected_at=NOW(), phi_flag=$2, updated_at=NOW()
     WHERE tenant_id=$3 AND id=$4`,
    [JSON.stringify(result.findings), phi_flag, tenantId, agentId]
  );
  await db.query(
    `INSERT INTO phi_inspection_runs (tenant_id, agent_id, findings, risk_delta)
     VALUES ($1,$2,$3,$4)`,
    [tenantId, agentId, JSON.stringify(result.findings), result.score]
  );
  return { ...result, agent_id: agentId, phi_flag };
}

async function inspectEstate(tenantId) {
  const { rows } = await db.query(`SELECT id FROM agents WHERE tenant_id=$1`, [tenantId]);
  const results = [];
  for (const r of rows) {
    results.push(await inspectAndPersist(tenantId, r.id));
  }
  return {
    inspected: results.length,
    flagged: results.filter((r) => r?.phi_flag_recommended).length,
    results,
  };
}

module.exports = {
  inspectText,
  inspectAgent,
  inspectAndPersist,
  inspectEstate,
  PATTERNS,
};
