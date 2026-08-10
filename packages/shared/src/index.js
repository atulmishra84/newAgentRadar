'use strict';

const crypto = require('crypto');

const AGENT_CATEGORIES = [
  'cloud', 'saas', 'healthcare', 'ide', 'local', 'local_llm',
  'framework', 'mcp', 'browser', 'ci', 'autonomous',
];

const CONFIDENCE_LEVELS = ['confirmed', 'likely', 'candidate'];
const LIFECYCLE_STATES = ['active', 'dormant', 'under_review', 'approved', 'retired', 'quarantined'];

const FRAMEWORKS = [
  'HIPAA', 'SOC2', 'ISO27001', 'GDPR', 'NIST_AI_RMF', 'EU_AI_ACT', 'HITRUST', 'FDA_SAMD',
];

const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  CISO: 'ciso',
  ANALYST: 'analyst',
  AUDITOR: 'auditor',
  VIEWER: 'viewer',
};

const TAGLINE = 'Know every agent, model, edge, and runtime in motion.';
const POSITIONING = 'Your CMDB for AI agents.';
const POSITIONING_LONG =
  'AgentRadar is the system of record for AI agents — discovering sanctioned and shadow agents across cloud, SaaS, healthcare, and endpoints so you can inventory, risk-score, and govern them.';

/** Land-and-expand wedge for first enterprise deals */
const FIRST_WAVE_PROVIDERS = ['azure', 'crowdstrike', 'intune', 'defender', 'github', 'epic', 'm365'];

const DEFAULT_RISK_WEIGHTS = {
  phi: 20,
  pii: 10,
  shadow: 25,
  compliance_per_fail: 3,
  compliance_cap: 20,
  no_owner: 10,
  never_reviewed: 10,
};

const CONNECTOR_PROVIDERS = [
  { id: 'azure', name: 'Microsoft Azure', group: 'cloud', fields: ['tenantId', 'clientId', 'clientSecret', 'subscriptionId'], firstWave: true, liveCapable: true },
  { id: 'aws', name: 'Amazon AWS', group: 'cloud', fields: ['accessKeyId', 'secretAccessKey', 'region'], firstWave: false, liveCapable: false },
  { id: 'gcp', name: 'Google Cloud', group: 'cloud', fields: ['projectId', 'serviceAccountJson'], firstWave: false, liveCapable: false },
  { id: 'm365', name: 'Microsoft 365 Copilot', group: 'saas', fields: ['tenantId', 'clientId', 'clientSecret'], firstWave: true, liveCapable: true },
  { id: 'salesforce', name: 'Salesforce Einstein', group: 'saas', fields: ['instanceUrl', 'clientId', 'clientSecret'], firstWave: false, liveCapable: false },
  { id: 'servicenow', name: 'ServiceNow Now Assist', group: 'saas', fields: ['instanceUrl', 'username', 'password'], firstWave: false, liveCapable: false },
  { id: 'epic', name: 'Epic EHR', group: 'healthcare', fields: ['fhirBaseUrl', 'clientId', 'clientSecret'], hipaa: true, firstWave: true, liveCapable: true },
  { id: 'cerner', name: 'Cerner / Oracle Health', group: 'healthcare', fields: ['fhirBaseUrl', 'clientId', 'clientSecret'], hipaa: true, firstWave: false, liveCapable: false },
  { id: 'meditech', name: 'Meditech Expanse', group: 'healthcare', fields: ['baseUrl', 'apiKey'], hipaa: true, firstWave: false, liveCapable: false },
  { id: 'crowdstrike', name: 'CrowdStrike Falcon', group: 'edr', fields: ['clientId', 'clientSecret', 'baseUrl'], firstWave: true, liveCapable: true },
  { id: 'defender', name: 'Microsoft Defender for Endpoint', group: 'edr', fields: ['tenantId', 'clientId', 'clientSecret'], firstWave: true, liveCapable: true },
  { id: 'intune', name: 'Microsoft Intune', group: 'edr', fields: ['tenantId', 'clientId', 'clientSecret'], firstWave: true, liveCapable: true },
  { id: 'cortex', name: 'Cortex XDR', group: 'edr', fields: ['apiKey', 'baseUrl'], firstWave: false, liveCapable: false },
  { id: 'sentinel', name: 'Microsoft Sentinel', group: 'siem', fields: ['workspaceId', 'tenantId', 'clientId', 'clientSecret'], firstWave: false, liveCapable: false },
  { id: 'splunk', name: 'Splunk', group: 'siem', fields: ['hecUrl', 'token'], firstWave: false, liveCapable: false },
  { id: 'elastic', name: 'Elastic SIEM', group: 'siem', fields: ['cloudId', 'apiKey'], firstWave: false, liveCapable: false },
  { id: 'qradar', name: 'IBM QRadar', group: 'siem', fields: ['host', 'token'], firstWave: false, liveCapable: false },
  { id: 'zscaler', name: 'Zscaler ZIA', group: 'network', fields: ['apiKey', 'username', 'password'], firstWave: false, liveCapable: false },
  { id: 'netskope', name: 'Netskope CASB', group: 'network', fields: ['tenant', 'token'], firstWave: false, liveCapable: false },
  { id: 'github', name: 'GitHub', group: 'git', fields: ['token', 'org'], firstWave: true, liveCapable: true },
  { id: 'gitlab', name: 'GitLab', group: 'git', fields: ['token', 'baseUrl'], firstWave: false, liveCapable: false },
  { id: 'jenkins', name: 'Jenkins', group: 'git', fields: ['baseUrl', 'username', 'apiToken'], firstWave: false, liveCapable: false },
];

/**
 * Stable identity across rediscovery — survives rename of display fields when external_id present.
 */
function agentFingerprint(agent) {
  const external = agent.external_id || agent.metadata?.azure_id || agent.metadata?.repo || agent.metadata?.external_id || '';
  const basis = external
    ? `${agent.category || ''}|${external}`
    : [
        agent.category || '',
        agent.hosting || '',
        agent.environment || '',
        (agent.name || '').toLowerCase().trim(),
        agent.model_ref || '',
      ].join('|');
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 32);
}

function scoreAgent(agent, weights = DEFAULT_RISK_WEIGHTS) {
  const w = { ...DEFAULT_RISK_WEIGHTS, ...(weights || {}) };
  const factors = [];
  let score = 0;

  // Active risk acceptance suppresses score contribution for reporting bands
  if (agent.risk_accepted && agent.risk_accepted_until && new Date(agent.risk_accepted_until) > new Date()) {
    return {
      risk_score: Math.min(agent.risk_score ?? 0, 29),
      risk_level: 'low',
      risk_factors: [{ code: 'risk_accepted', weight: 0, detail: `Accepted until ${agent.risk_accepted_until}` }],
    };
  }

  if (agent.phi_flag) {
    score += w.phi;
    factors.push({ code: 'phi_access', weight: w.phi, detail: 'Agent accesses PHI' });
  }
  if (agent.pii_flag) {
    score += w.pii;
    factors.push({ code: 'pii_access', weight: w.pii, detail: 'Agent accesses PII' });
  }
  if (agent.shadow) {
    score += w.shadow;
    factors.push({ code: 'shadow_ai', weight: w.shadow, detail: 'Unauthorized / shadow AI' });
  }

  const frameworks = agent.framework_scores || {};
  let failCount = 0;
  for (const fw of FRAMEWORKS) {
    const status = frameworks[fw]?.status || frameworks[fw];
    if (status === 'fail') failCount += 1;
  }
  const compliancePenalty = Math.min(w.compliance_cap, failCount * w.compliance_per_fail);
  if (compliancePenalty > 0) {
    score += compliancePenalty;
    factors.push({
      code: 'compliance_failures',
      weight: compliancePenalty,
      detail: `${failCount} framework failure(s)`,
    });
  }

  if (!agent.owner) {
    score += w.no_owner;
    factors.push({ code: 'no_owner', weight: w.no_owner, detail: 'No assigned owner' });
  }

  if (!agent.last_reviewed_at) {
    score += w.never_reviewed;
    factors.push({ code: 'never_reviewed', weight: w.never_reviewed, detail: 'Never reviewed' });
  }

  score = Math.max(0, Math.min(100, score));
  const risk_level =
    score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 30 ? 'medium' : 'low';

  return { risk_score: score, risk_level, risk_factors: factors };
}

function confidenceFromSources(sources) {
  const n = Array.isArray(sources) ? sources.length : 0;
  if (n >= 3) return 'confirmed';
  if (n === 2) return 'likely';
  return 'candidate';
}

function buildFrameworkScores(agent) {
  const scores = {};
  for (const fw of FRAMEWORKS) {
    let status = 'pass';
    if (agent.phi_flag && ['HIPAA', 'HITRUST'].includes(fw)) {
      if (!agent.baa_status || agent.baa_status === 'missing') status = 'fail';
      else if (agent.baa_status === 'pending') status = 'warn';
    }
    if (agent.shadow && ['SOC2', 'NIST_AI_RMF', 'EU_AI_ACT'].includes(fw)) {
      status = status === 'fail' ? 'fail' : 'warn';
    }
    if (!agent.owner && fw === 'ISO27001') status = status === 'fail' ? 'fail' : 'warn';
    if (agent.category === 'healthcare' && fw === 'FDA_SAMD' && agent.lifecycle !== 'approved') {
      status = status === 'fail' ? 'fail' : 'warn';
    }
    if (agent.pii_flag && fw === 'GDPR' && !agent.owner) status = 'fail';
    scores[fw] = { status, score: status === 'pass' ? 100 : status === 'warn' ? 60 : 25 };
  }
  return scores;
}

module.exports = {
  AGENT_CATEGORIES,
  CONFIDENCE_LEVELS,
  LIFECYCLE_STATES,
  FRAMEWORKS,
  ROLES,
  CONNECTOR_PROVIDERS,
  FIRST_WAVE_PROVIDERS,
  DEFAULT_RISK_WEIGHTS,
  TAGLINE,
  POSITIONING,
  POSITIONING_LONG,
  agentFingerprint,
  scoreAgent,
  confidenceFromSources,
  buildFrameworkScores,
};
