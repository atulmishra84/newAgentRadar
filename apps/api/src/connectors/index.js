'use strict';

const { CONNECTOR_PROVIDERS } = require('@agentradar/shared');
const config = require('../config');

function providerMeta(id) {
  return CONNECTOR_PROVIDERS.find((p) => p.id === id);
}

/** Demo/mock agent payloads per provider */
function mockAgentsForProvider(provider) {
  const now = new Date().toISOString();
  const catalogs = {
    azure: [
      { name: 'Azure OpenAI — prod-eastus', category: 'cloud', environment: 'production', hosting: 'Azure', model_ref: 'GPT-4o', phi_flag: true, pii_flag: true, shadow: false, owner: 'cloud-platform@acme.health', detection_sources: ['azure'], data_stores: ['Azure Blob PHI'], protocols: ['HTTPS', 'OpenAI API'] },
      { name: 'Copilot Studio — Triage Bot', category: 'cloud', environment: 'production', hosting: 'Azure', model_ref: 'GPT-4o', phi_flag: true, shadow: false, owner: 'care-ops@acme.health', detection_sources: ['azure'], protocols: ['Bot Framework'] },
    ],
    aws: [
      { name: 'Bedrock Agent — ClaimsAssist', category: 'cloud', environment: 'production', hosting: 'AWS', model_ref: 'Claude 3.5', phi_flag: true, shadow: false, owner: 'claims@acme.health', detection_sources: ['aws'], protocols: ['Bedrock Runtime'] },
    ],
    gcp: [
      { name: 'Vertex AI Agent — ImagingQA', category: 'cloud', environment: 'staging', hosting: 'GCP', model_ref: 'Gemini', phi_flag: true, shadow: false, owner: 'radiology-it@acme.health', detection_sources: ['gcp'] },
    ],
    m365: [
      { name: 'M365 Copilot — Corporate', category: 'saas', environment: 'production', hosting: 'Microsoft 365', model_ref: 'GPT-4o', pii_flag: true, shadow: false, owner: 'it@acme.health', detection_sources: ['m365'] },
    ],
    salesforce: [
      { name: 'Salesforce Agentforce — CRM', category: 'saas', environment: 'production', hosting: 'Salesforce', pii_flag: true, shadow: false, owner: 'sales-ops@acme.health', detection_sources: ['salesforce'] },
    ],
    servicenow: [
      { name: 'Now Assist — ITSM', category: 'saas', environment: 'production', hosting: 'ServiceNow', shadow: false, owner: 'itsm@acme.health', detection_sources: ['servicenow'] },
    ],
    epic: [
      { name: 'Epic Cosmos AI Insights', category: 'healthcare', environment: 'production', hosting: 'Epic', phi_flag: true, pii_flag: true, shadow: false, owner: 'ehr-admin@acme.health', detection_sources: ['epic'], data_stores: ['Epic Clarity'], baa_status: 'signed' },
    ],
    cerner: [
      { name: 'Oracle Health AI Marketplace — CDS', category: 'healthcare', environment: 'production', hosting: 'Cerner', phi_flag: true, shadow: false, owner: 'clinical-informatics@acme.health', detection_sources: ['cerner'], baa_status: 'pending' },
    ],
    meditech: [
      { name: 'Meditech Expanse CDS AI', category: 'healthcare', environment: 'production', hosting: 'Meditech', phi_flag: true, shadow: false, detection_sources: ['meditech'], baa_status: 'missing' },
    ],
    crowdstrike: [
      { name: 'Ollama on WS-ENG-4421', category: 'local_llm', environment: 'endpoint', hosting: 'Local', model_ref: 'Llama 3', shadow: true, phi_flag: false, detection_sources: ['crowdstrike'], protocols: ['localhost:11434'] },
      { name: 'Cursor IDE Agent — DEV-LAPTOP-19', category: 'ide', environment: 'endpoint', hosting: 'Local', model_ref: 'GPT-4o', shadow: true, pii_flag: true, detection_sources: ['crowdstrike'] },
    ],
    defender: [
      { name: 'LM Studio — CLIN-PC-08', category: 'local_llm', environment: 'endpoint', hosting: 'Local', model_ref: 'Mistral', shadow: true, phi_flag: true, detection_sources: ['defender'], baa_status: 'missing' },
    ],
    intune: [
      { name: 'Jan AI — WIN-FLEET install', category: 'local', environment: 'endpoint', hosting: 'Windows', shadow: true, detection_sources: ['intune'] },
    ],
    cortex: [
      { name: 'Browser AI Extension Cluster', category: 'browser', environment: 'endpoint', hosting: 'Chrome', shadow: true, detection_sources: ['cortex'] },
    ],
    sentinel: [
      { name: 'Anon OpenAI API traffic pattern', category: 'saas', environment: 'production', hosting: 'Unknown', shadow: true, pii_flag: true, detection_sources: ['sentinel'] },
    ],
    splunk: [
      { name: 'Shadow ChatGPT SaaS usage', category: 'saas', environment: 'corporate', hosting: 'OpenAI', shadow: true, detection_sources: ['splunk'] },
    ],
    elastic: [
      { name: 'ML anomaly — LLM egress burst', category: 'autonomous', environment: 'production', hosting: 'Unknown', shadow: true, detection_sources: ['elastic'] },
    ],
    qradar: [
      { name: 'Correlated AI threat actor pattern', category: 'autonomous', environment: 'production', shadow: true, detection_sources: ['qradar'] },
    ],
    zscaler: [
      { name: 'claude.ai via ZIA proxy', category: 'saas', environment: 'corporate', hosting: 'Anthropic', shadow: true, detection_sources: ['zscaler'] },
    ],
    netskope: [
      { name: 'Unauthorized Poe.com usage', category: 'saas', environment: 'corporate', shadow: true, detection_sources: ['netskope'] },
    ],
    github: [
      { name: 'LangChain claims-bot service', category: 'framework', environment: 'production', hosting: 'AKS', model_ref: 'Azure OpenAI', phi_flag: true, owner: 'platform@acme.health', detection_sources: ['github'], protocols: ['LangChain'] },
      { name: 'Internal MCP server — fhir-tools', category: 'mcp', environment: 'production', hosting: 'Internal', phi_flag: true, detection_sources: ['github'] },
    ],
    gitlab: [
      { name: 'CrewAI ops-agent repo', category: 'framework', environment: 'staging', hosting: 'GitLab CI', detection_sources: ['gitlab'] },
    ],
    jenkins: [
      { name: 'Jenkins AI release notes job', category: 'ci', environment: 'ci', hosting: 'Jenkins', detection_sources: ['jenkins'] },
    ],
  };

  return (catalogs[provider] || []).map((a) => ({
    ...a,
    type: 'agent',
    version: a.version || '1.0',
    lifecycle: a.shadow ? 'under_review' : 'active',
    last_seen: now,
    metadata: { discovered_via: provider, demo: config.discoveryDemoMode },
  }));
}

async function testConnector(provider, credentials) {
  const meta = providerMeta(provider);
  if (!meta) return { ok: false, error: 'Unknown provider' };

  if (provider === 'azure' && credentials?.clientId && !config.discoveryDemoMode) {
    // Real credential presence check only in non-demo; full ARM scan is separate
    if (!credentials.tenantId || !credentials.clientSecret) {
      return { ok: false, error: 'Missing Azure credentials' };
    }
  }

  if (provider === 'github' && credentials?.token && !config.discoveryDemoMode) {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${credentials.token}`,
          'User-Agent': 'AgentRadar',
          Accept: 'application/vnd.github+json',
        },
      });
      if (!res.ok) return { ok: false, error: `GitHub auth failed (${res.status})` };
      return { ok: true, message: 'GitHub credentials validated' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Demo mode or remaining providers: accept well-formed credential objects
  const missing = (meta.fields || []).filter((f) => !credentials?.[f]);
  if (missing.length && !config.discoveryDemoMode) {
    return { ok: false, error: `Missing fields: ${missing.join(', ')}` };
  }
  return {
    ok: true,
    message: config.discoveryDemoMode
      ? `Demo mode: ${meta.name} connector accepted`
      : `${meta.name} connector credentials accepted`,
    hipaa: !!meta.hipaa,
  };
}

async function scanProvider(provider, credentials) {
  // First-wave real-ish paths fall back to mock when demo mode or missing secrets
  if (provider === 'azure' && !config.discoveryDemoMode && credentials?.clientId) {
    try {
      const real = await scanAzure(credentials);
      if (real.length) return real;
    } catch (err) {
      console.warn('Azure scan failed, falling back to mock:', err.message);
    }
  }
  if (provider === 'github' && !config.discoveryDemoMode && credentials?.token) {
    try {
      const real = await scanGitHub(credentials);
      if (real.length) return real;
    } catch (err) {
      console.warn('GitHub scan failed, falling back to mock:', err.message);
    }
  }
  return mockAgentsForProvider(provider);
}

async function scanAzure(credentials) {
  // Lightweight token acquisition; returns mock-shaped resources if ARM unavailable
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        scope: 'https://management.azure.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  );
  if (!tokenRes.ok) throw new Error('Azure token failed');
  const { access_token } = await tokenRes.json();
  const url = `https://management.azure.com/subscriptions/${credentials.subscriptionId}/resources?api-version=2021-04-01`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!res.ok) throw new Error('Azure ARM list failed');
  const data = await res.json();
  const aiTypes = /cognitive|machinelearning|openai|bot|ai/i;
  return (data.value || [])
    .filter((r) => aiTypes.test(r.type + r.name))
    .map((r) => ({
      name: r.name,
      category: 'cloud',
      environment: (r.tags && (r.tags.env || r.tags.environment)) || 'production',
      hosting: 'Azure',
      owner: r.tags?.owner || r.tags?.Owner || null,
      shadow: !(r.tags && (r.tags.owner || r.tags.Owner)),
      detection_sources: ['azure'],
      metadata: { azure_id: r.id, type: r.type, location: r.location, tags: r.tags || {} },
      tags: r.tags || {},
      protocols: ['HTTPS'],
    }));
}

async function scanGitHub(credentials) {
  const org = credentials.org;
  const headers = {
    Authorization: `Bearer ${credentials.token}`,
    'User-Agent': 'AgentRadar',
    Accept: 'application/vnd.github+json',
  };
  const url = org
    ? `https://api.github.com/orgs/${org}/repos?per_page=30`
    : 'https://api.github.com/user/repos?per_page=30';
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error('GitHub repos failed');
  const repos = await res.json();
  const markers = /langchain|autogen|crewai|openai|anthropic|ollama|mcp/i;
  return repos
    .filter((r) => markers.test(r.name + ' ' + (r.description || '')))
    .map((r) => ({
      name: `GitHub — ${r.full_name}`,
      category: /mcp/i.test(r.name) ? 'mcp' : 'framework',
      environment: r.private ? 'production' : 'public',
      hosting: 'GitHub',
      shadow: !r.private,
      detection_sources: ['github'],
      metadata: { repo: r.html_url, description: r.description },
      protocols: ['git'],
    }));
}

async function scanIntuneOrCrowdStrike(provider) {
  // EDR path: demo inventory of local AI processes
  return mockAgentsForProvider(provider === 'intune' ? 'intune' : 'crowdstrike');
}

module.exports = {
  CONNECTOR_PROVIDERS,
  providerMeta,
  testConnector,
  scanProvider,
  scanIntuneOrCrowdStrike,
  mockAgentsForProvider,
};
