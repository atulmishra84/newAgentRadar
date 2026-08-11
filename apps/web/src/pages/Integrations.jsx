import { useState, useEffect } from 'react'
import { integrationsAPI } from '../lib/api'

// ─── Integration catalog with per-provider dynamic form fields ──────────────────
const INTEGRATIONS = [
  // ── Cloud Providers ──────────────────────────────────────────────────────────
  {
    id: 'azure', name: 'Microsoft Azure', cat: 'Cloud Provider', icon: '🔷',
    desc: 'Discover AI workloads across Azure Cognitive Services, OpenAI, and ML Studio',
    color: '#0078d4',
    fields: [
      { key: 'tenantId',      label: 'Tenant ID',       type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'clientId',      label: 'App (Client) ID', type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'clientSecret',  label: 'Client Secret',   type: 'password', placeholder: 'Enter client secret value',           required: true },
      { key: 'subscriptionId',label: 'Subscription ID', type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: false },
    ],
  },
  {
    id: 'aws', name: 'Amazon AWS', cat: 'Cloud Provider', icon: '🟠',
    desc: 'Discover AI agents running on SageMaker, Bedrock, Lambda, and ECS',
    color: '#ff9900',
    fields: [
      { key: 'accessKeyId',     label: 'Access Key ID',     type: 'text',     placeholder: 'AKIAIOSFODNN7EXAMPLE', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', placeholder: 'Enter secret access key', required: true },
      { key: 'region',          label: 'Default Region',    type: 'text',     placeholder: 'us-east-1',              required: false },
      { key: 'roleArn',         label: 'IAM Role ARN (optional)', type: 'text', placeholder: 'arn:aws:iam::123456789012:role/AgentRadarRole', required: false },
    ],
  },
  {
    id: 'gcp', name: 'Google Cloud', cat: 'Cloud Provider', icon: '🟢',
    desc: 'Discover AI models on Vertex AI, Cloud AI APIs, and Gemini deployments',
    color: '#34a853',
    fields: [
      { key: 'projectId',         label: 'Project ID',                 type: 'text',     placeholder: 'my-gcp-project-id',   required: true },
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', placeholder: '{ "type": "service_account", ... }', required: true },
    ],
  },
  // ── Security & Endpoint ──────────────────────────────────────────────────────
  {
    id: 'crowdstrike', name: 'CrowdStrike Falcon', cat: 'Endpoint', icon: '🦅',
    desc: 'Detect AI agents running on managed endpoints via CrowdStrike RTR and XDR',
    color: '#e0161e',
    fields: [
      { key: 'clientId',     label: 'OAuth2 Client ID',     type: 'text',     placeholder: 'CrowdStrike API client ID',     required: true },
      { key: 'clientSecret', label: 'OAuth2 Client Secret', type: 'password', placeholder: 'Enter client secret',           required: true },
      { key: 'baseUrl',      label: 'API Base URL',         type: 'text',     placeholder: 'https://api.crowdstrike.com',   required: false },
    ],
  },
  {
    id: 'cortex_xdr', name: 'Palo Alto Cortex XDR', cat: 'Endpoint', icon: '🔮',
    desc: 'Detect AI processes across endpoints monitored by Cortex XDR',
    color: '#fa582d',
    fields: [
      { key: 'apiKeyId',  label: 'API Key ID',       type: 'text',     placeholder: 'Enter API key ID',               required: true },
      { key: 'apiKey',    label: 'API Key',          type: 'password', placeholder: 'Enter API key',                  required: true },
      { key: 'fqdn',      label: 'Tenant FQDN',      type: 'text',     placeholder: 'api-tenant.xdr.us.paloaltonetworks.com', required: true },
      { key: 'apiKeyType',label: 'API Key Type',     type: 'select',   options: ['Advanced', 'Standard'],             required: false },
    ],
  },
  {
    id: 'sentinelone', name: 'SentinelOne', cat: 'Endpoint', icon: '🛡️',
    desc: 'Scan managed endpoints for AI processes via SentinelOne Deep Visibility',
    color: '#6f2de4',
    fields: [
      { key: 'apiToken',  label: 'API Token',     type: 'password', placeholder: 'Enter SentinelOne API token', required: true },
      { key: 'baseUrl',   label: 'Console URL',   type: 'text',     placeholder: 'https://tenant.sentinelone.net', required: true },
    ],
  },
  {
    id: 'intune', name: 'Microsoft Intune', cat: 'Endpoint', icon: '💻',
    desc: 'Detect AI apps installed on Intune-managed devices via Microsoft Graph',
    color: '#0078d4',
    fields: [
      { key: 'tenantId',     label: 'Tenant ID',      type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'clientId',     label: 'App (Client) ID',type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'clientSecret', label: 'Client Secret',  type: 'password', placeholder: 'Enter client secret value',           required: true },
    ],
  },
  // ── SIEM ─────────────────────────────────────────────────────────────────────
  {
    id: 'splunk', name: 'Splunk', cat: 'SIEM', icon: '📊',
    desc: 'Send AI agent alerts to Splunk via HTTP Event Collector (HEC)',
    color: '#65a637',
    fields: [
      { key: 'url',      label: 'Splunk HEC URL', type: 'text',     placeholder: 'https://splunk.company.com:8088', required: true },
      { key: 'token',    label: 'HEC Token',      type: 'password', placeholder: 'Enter HEC token',                required: true },
      { key: 'index',    label: 'Index',           type: 'text',     placeholder: 'main',                           required: false },
    ],
  },
  {
    id: 'sentinel', name: 'Microsoft Sentinel', cat: 'SIEM', icon: '🔍',
    desc: 'Stream AI agent risk events to Microsoft Sentinel via DCR / Log Analytics',
    color: '#0078d4',
    fields: [
      { key: 'workspaceId',  label: 'Workspace ID',       type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'primaryKey',   label: 'Primary Key',        type: 'password', placeholder: 'Enter workspace primary key',          required: true },
      { key: 'logType',      label: 'Custom Log Type',    type: 'text',     placeholder: 'AgentRadar_Alerts',                    required: false },
    ],
  },
  // ── Identity ─────────────────────────────────────────────────────────────────
  {
    id: 'okta', name: 'Okta', cat: 'Identity', icon: '🔵',
    desc: 'Correlate AI agent access patterns with Okta identity and SSO logs',
    color: '#007dc1',
    fields: [
      { key: 'domain',   label: 'Okta Domain',  type: 'text',     placeholder: 'https://yourorg.okta.com',  required: true },
      { key: 'apiToken', label: 'API Token',     type: 'password', placeholder: 'Enter Okta API token',     required: true },
    ],
  },
  {
    id: 'entra', name: 'Microsoft Entra ID', cat: 'Identity', icon: '🆔',
    desc: 'Correlate AI agent activities with Entra ID sign-in logs and service principals',
    color: '#0078d4',
    fields: [
      { key: 'tenantId',     label: 'Tenant ID',      type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'clientId',     label: 'App (Client) ID',type: 'text',     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true },
      { key: 'clientSecret', label: 'Client Secret',  type: 'password', placeholder: 'Enter client secret value',           required: true },
    ],
  },
  // ── Healthcare ────────────────────────────────────────────────────────────────
  {
    id: 'epic', name: 'Epic EHR', cat: 'Healthcare', icon: '🏥',
    desc: 'Scan FHIR API traffic from Epic for unauthorized AI data access',
    color: '#e31b23',
    fields: [
      { key: 'baseUrl',       label: 'FHIR Base URL', type: 'text',     placeholder: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4', required: true },
      { key: 'clientId',      label: 'Client ID',     type: 'text',     placeholder: 'Epic App Client ID',  required: true },
      { key: 'privateKey',    label: 'Private Key (PEM)', type: 'textarea', placeholder: '-----BEGIN RSA PRIVATE KEY-----', required: true },
    ],
  },
  {
    id: 'cerner', name: 'Oracle Cerner', cat: 'Healthcare', icon: '🩺',
    desc: 'Monitor FHIR API access and AI data flows in Cerner Millennium',
    color: '#e63012',
    fields: [
      { key: 'fhirUrl',   label: 'FHIR Base URL',       type: 'text',     placeholder: 'https://fhir-ehr.cerner.com/r4', required: true },
      { key: 'accountId', label: 'Cerner Account ID',   type: 'text',     placeholder: 'Enter account ID',               required: true },
      { key: 'secret',    label: 'Client Secret',        type: 'password', placeholder: 'Enter client secret',            required: true },
    ],
  },
  // ── Developer Tools ───────────────────────────────────────────────────────────
  {
    id: 'github', name: 'GitHub', cat: 'VCS / Dev Tools', icon: '🐙',
    desc: 'Scan GitHub repos and Actions for AI agents, secret leaks, and LLM dependencies',
    color: '#24292e',
    fields: [
      { key: 'pat',     label: 'Personal Access Token (PAT)', type: 'password', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx', required: true },
      { key: 'org',     label: 'Organization (optional)',     type: 'text',     placeholder: 'my-org-name',              required: false },
    ],
  },
  {
    id: 'jira', name: 'Jira', cat: 'VCS / Dev Tools', icon: '🔧',
    desc: 'Create Jira tickets automatically for agent violations and policy breaches',
    color: '#0052cc',
    fields: [
      { key: 'baseUrl',  label: 'Jira Base URL',  type: 'text',     placeholder: 'https://yourorg.atlassian.net', required: true },
      { key: 'email',    label: 'User Email',     type: 'text',     placeholder: 'admin@company.com',             required: true },
      { key: 'apiToken', label: 'API Token',      type: 'password', placeholder: 'Enter Atlassian API token',    required: true },
      { key: 'project',  label: 'Project Key',    type: 'text',     placeholder: 'SEC',                          required: false },
    ],
  },
  // ── Network ───────────────────────────────────────────────────────────────────
  {
    id: 'zscaler', name: 'Zscaler', cat: 'Network / Proxy', icon: '🔒',
    desc: 'Ingest Zscaler proxy logs to detect AI service usage across your network',
    color: '#005EB8',
    fields: [
      { key: 'apiKey',    label: 'API Key',        type: 'password', placeholder: 'Enter Zscaler API key',          required: true },
      { key: 'cloudName', label: 'Cloud Name',     type: 'text',     placeholder: 'zsapi.zscalerone.net',           required: true },
    ],
  },
  {
    id: 'palo_alto', name: 'Palo Alto Firewall', cat: 'Network / Proxy', icon: '🧱',
    desc: 'Monitor AI API traffic via Palo Alto Next-Gen Firewall logs and App-ID',
    color: '#fa582d',
    fields: [
      { key: 'host',   label: 'Firewall Host/IP',  type: 'text',     placeholder: '192.168.1.1 or firewall.corp.com', required: true },
      { key: 'apiKey', label: 'API Key',            type: 'password', placeholder: 'Enter Palo Alto API key',         required: true },
      { key: 'vsys',   label: 'Virtual System',     type: 'text',     placeholder: 'vsys1',                          required: false },
    ],
  },
  // ── Communication ─────────────────────────────────────────────────────────────
  {
    id: 'slack', name: 'Slack', cat: 'Communication', icon: '💬',
    desc: 'Send real-time AI agent alerts and policy violation notifications to Slack',
    color: '#4a154b',
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/services/T.../B.../xxx', required: true },
      { key: 'channel',    label: 'Channel (optional)',   type: 'text', placeholder: '#ai-security',                                    required: false },
    ],
  },
  {
    id: 'teams', name: 'Microsoft Teams', cat: 'Communication', icon: '📣',
    desc: 'Post AI risk alerts and governance summaries to Microsoft Teams channels',
    color: '#6264a7',
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', type: 'text', placeholder: 'https://outlook.office.com/webhook/...', required: true },
    ],
  },
]

const ALL_CATS = ['All', ...Array.from(new Set(INTEGRATIONS.map(i => i.cat)))]

const STATUS_STYLES = {
  connected:    { label: '● Connected',    color: 'var(--green-text)',   bg: 'var(--green-bg)',   border: 'var(--green-border)' },
  disconnected: { label: '○ Not Connected', color: 'var(--text-muted)',  bg: 'rgba(200,210,240,0.15)', border: 'rgba(200,210,240,0.4)' },
  error:        { label: '⚠ Error',        color: 'var(--red-text)',     bg: 'var(--red-bg)',     border: 'var(--red-border)' },
}

export default function Integrations() {
  const [filter, setFilter]         = useState('All')
  const [connecting, setConnecting] = useState(null)       // current integration object
  const [formValues, setFormValues] = useState({})
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)
  const [savedCreds, setSavedCreds] = useState({})         // provider → { _saved, _updatedAt, ...fields }
  const [loadingCreds, setLoadingCreds] = useState(true)
  const [disconnecting, setDisconnecting] = useState(null) // provider id being disconnected
  const [scanning, setScanning] = useState(null)           // provider id being scanned
  const [testingConnection, setTestingConnection] = useState(null)
  const [scanResult, setScanResult] = useState(null)       // toast notification state

  // Load saved credentials on mount
  useEffect(() => {
    integrationsAPI.getCredentials()
      .then(r => setSavedCreds(r.data || {}))
      .catch(() => {})
      .finally(() => setLoadingCreds(false))
  }, [])

  const openModal = (integration) => {
    const existing = savedCreds[integration.id] || {}
    const initial = {}
    integration.fields.forEach(f => { initial[f.key] = existing[f.key] || '' })
    setFormValues(initial)
    setSaveError(null)
    setConnecting(integration)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await integrationsAPI.save(connecting.id, formValues)
      setSavedCreds(prev => ({
        ...prev,
        [connecting.id]: { ...formValues, _saved: true, _updatedAt: new Date().toISOString() }
      }))
      setConnecting(null)
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async (providerId, e) => {
    e.stopPropagation()
    setDisconnecting(providerId)
    try {
      await integrationsAPI.remove(providerId)
      setSavedCreds(prev => { const n = {...prev}; delete n[providerId]; return n })
    } catch {}
    setDisconnecting(null)
  }

  const handleScan = async (providerId, e) => {
    e.stopPropagation()
    setScanning(providerId)
    setScanResult(null)
    try {
      const res = await integrationsAPI.scan(providerId)
      const sessionId = res.data.sessionId
      
      const poll = setInterval(async () => {
        try {
          const statusRes = await integrationsAPI.checkScanStatus(sessionId)
          const status = statusRes.data || {}
          if (status.status === 'completed') {
            clearInterval(poll)
            setScanning(null)
            setScanResult({ type: 'success', msg: `Scan complete: ${status.agentCount || 0} agents discovered.` })
            setTimeout(() => setScanResult(null), 5000)
          } else if (status.status === 'error' || status.status === 'failed') {
            clearInterval(poll)
            setScanning(null)
            setScanResult({ type: 'error', msg: status.error || 'Scan failed' })
            setTimeout(() => setScanResult(null), 5000)
          }
        } catch (err) {}
      }, 2000)
    } catch (err) {
      setScanning(null)
      setScanResult({ type: 'error', msg: err.response?.data?.error || err.message || 'Scan failed to start' })
      setTimeout(() => setScanResult(null), 5000)
    }
  }
  const handleTestConnection = async (providerId, e) => {
    e.stopPropagation()
    setTestingConnection(providerId)
    setScanResult(null)
    try {
      const res = await integrationsAPI.test(providerId)
      setScanResult({ type: 'success', msg: res.data.message || 'Connection successful' })
    } catch (err) {
      setScanResult({ type: 'error', msg: err.response?.data?.error || err.message || 'Connection failed' })
    } finally {
      setTestingConnection(null)
      setTimeout(() => setScanResult(null), 5000)
    }
  }

  const filtered = INTEGRATIONS.filter(i => filter === 'All' || i.cat === filter)

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', letterSpacing: -0.5 }}>Connect Hub</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {Object.keys(savedCreds).length} of {INTEGRATIONS.length} integrations connected
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {ALL_CATS.map(cat => (
            <button
              key={cat}
              className={`btn sm ${filter === cat ? 'primary' : 'outline'}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Connected', value: Object.keys(savedCreds).length, color: 'var(--green-text)', bg: 'var(--green-bg)' },
          { label: 'Available', value: INTEGRATIONS.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'Not Connected', value: INTEGRATIONS.length - Object.keys(savedCreds).length, color: 'var(--text-muted)', bg: 'rgba(200,210,240,0.15)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Integration cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map(integration => {
          const saved = savedCreds[integration.id]
          const isConnected = !!saved?._saved
          const ss = STATUS_STYLES[isConnected ? 'connected' : 'disconnected']
          return (
            <div
              key={integration.id}
              className="card"
              onClick={() => openModal(integration)}
              style={{
                padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'transform 0.18s, box-shadow 0.18s',
                borderLeft: isConnected ? `3px solid ${integration.color}` : '3px solid transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow-lg)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, background: integration.color + '18', flexShrink: 0,
                }}>
                  {integration.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{integration.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>{integration.cat}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, flexShrink: 0,
                  color: ss.color, background: ss.bg, border: `1px solid ${ss.border}`,
                }}>
                  {ss.label}
                </span>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {integration.desc}
              </div>

              {isConnected && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Last saved: {new Date(saved._updatedAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button 
                      className={`btn sm secondary`} 
                      onClick={(e) => handleTestConnection(integration.id, e)}
                      disabled={testingConnection === integration.id || scanning === integration.id}
                    >
                      {testingConnection === integration.id ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button 
                      className={`btn sm ${scanning === integration.id ? 'ai' : 'primary'}`} 
                      onClick={(e) => handleScan(integration.id, e)}
                      disabled={scanning === integration.id}
                    >
                      {scanning === integration.id ? 'Scanning...' : 'Run Scan'}
                    </button>
                    <button 
                      className="btn danger sm" 
                      onClick={(e) => handleDisconnect(integration.id, e)}
                      disabled={disconnecting === integration.id || scanning === integration.id}
                    >
                      {disconnecting === integration.id ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              )}
              {!isConnected && (
                <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>
                  + Configure integration →
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Integration config modal ── */}
      {connecting && (
        <>
          <div
            onClick={() => setConnecting(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,22,0.55)', backdropFilter: 'blur(6px)', zIndex: 1000 }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{
              background: 'var(--glass-white-hov)', backdropFilter: 'blur(24px)',
              border: '1px solid var(--glass-border)', borderRadius: 20, width: '100%', maxWidth: 480,
              boxShadow: 'var(--glass-shadow-lg)', overflow: 'hidden',
            }}>
              {/* Modal header */}
              <div style={{
                padding: '18px 24px', borderBottom: '1px solid var(--glass-border-dim)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 22, background: connecting.color + '18',
                }}>
                  {connecting.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                    Configure {connecting.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{connecting.cat}</div>
                </div>
                <button
                  onClick={() => setConnecting(null)}
                  style={{
                    background: 'transparent', border: '1px solid var(--glass-border-dim)', borderRadius: 8,
                    width: 30, height: 30, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSave}>
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '55vh', overflowY: 'auto' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, padding: '10px 12px', background: connecting.color + '12', borderRadius: 8, borderLeft: `3px solid ${connecting.color}` }}>
                    {connecting.desc}
                  </div>

                  {connecting.fields.map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {field.label} {field.required && <span style={{ color: 'var(--red-text)' }}>*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formValues[field.key] || ''}
                          onChange={e => setFormValues(p => ({ ...p, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          required={field.required}
                          rows={4}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 12, resize: 'vertical',
                            border: '1px solid var(--glass-border)', background: 'var(--glass-white)',
                            color: 'var(--text-primary)', outline: 'none', fontFamily: 'monospace',
                            boxSizing: 'border-box',
                          }}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formValues[field.key] || ''}
                          onChange={e => setFormValues(p => ({ ...p, [field.key]: e.target.value }))}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 12,
                            border: '1px solid var(--glass-border)', background: 'var(--glass-white)',
                            color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                          }}
                        >
                          <option value="">Select…</option>
                          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={formValues[field.key] || ''}
                          onChange={e => setFormValues(p => ({ ...p, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          required={field.required}
                          style={{
                            width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 12,
                            border: '1px solid var(--glass-border)', background: 'var(--glass-white)',
                            color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      )}
                    </div>
                  ))}

                  {saveError && (
                    <div style={{ color: 'var(--red-text)', fontSize: 12, fontWeight: 600, padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 8, border: '1px solid var(--red-border)' }}>
                      ⚠ {saveError}
                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div style={{
                  padding: '16px 24px', borderTop: '1px solid var(--glass-border-dim)',
                  display: 'flex', justifyContent: 'flex-end', gap: 10,
                }}>
                  <button type="button" className="btn outline" onClick={() => setConnecting(null)}>Cancel</button>
                  <button type="submit" className="btn primary" disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save Credentials'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification for Scans */}
      {scanResult && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: scanResult.type === 'error' ? 'var(--red-bg)' : 'var(--green-bg)',
          color: scanResult.type === 'error' ? 'var(--red-text)' : 'var(--green-text)',
          border: `1px solid ${scanResult.type === 'error' ? 'var(--red-border)' : 'var(--green-border)'}`,
          padding: '14px 24px', borderRadius: '12px',
          boxShadow: 'var(--glass-shadow-lg)', fontWeight: 600, fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'view-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'
        }}>
          {scanResult.type === 'error' ? '⚠' : '✓'} {scanResult.msg}
        </div>
      )}
    </div>
  )
}
