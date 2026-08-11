/* ═══════════════════════════════════════════
   HELPERS — ported from static/app.js
   ═══════════════════════════════════════════ */

// XSS-safe HTML escape
export function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;')
}

// Risk level → CSS class string
export function riskClass(level) {
  return `rtag rt-${level}`
}

// Compliance score 0-100
export function cscore(controls) {
  if (!controls) return 0
  const v = Object.values(controls)
  if (v.length === 0) return 0
  return Math.round(v.reduce((a, x) => a + (x === 'pass' ? 2 : x === 'warn' ? 1 : 0), 0) / (v.length * 2) * 100)
}

// Get formatted cost from agents
export function getFormattedCost(agents) {
  const total = agents.reduce((sum, a) => sum + (a.monthlyCost || 0), 0)
  if (total === 0) return '$0'
  if (total >= 1000) return `$${(total / 1000).toFixed(1)}k`
  return `$${total}`
}

// Format relative time
export function relTime(isoStr) {
  if (!isoStr) return '—'
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Severity color map
export const SEVERITY_COLORS = {
  critical: { dot: 'var(--red)',   text: 'var(--red-text)',   bg: 'var(--red-bg)',   border: 'var(--red-border)' },
  high:     { dot: 'var(--amber)', text: 'var(--amber-text)', bg: 'var(--amber-bg)', border: 'var(--amber-border)' },
  medium:   { dot: 'var(--brand)', text: 'var(--brand)',      bg: 'var(--brand-bg)', border: 'var(--brand-border)' },
  low:      { dot: 'var(--green)', text: 'var(--green-text)', bg: 'var(--green-bg)', border: 'var(--green-border)' },
}

// Compute violations list
export function computeViolations(agents, policies) {
  const vs = []
  agents.forEach(a => {
    policies.filter(p => p.on).forEach(p => {
      let hit = false
      if (p.cond === 'pii_no_gdpr' && a.pii && a.controls?.gdpr !== 'pass') hit = true
      if (p.cond === 'shadow_critical' && a.shadow && a.risk === 'critical') hit = true
      if (p.cond === 'unknown_proto' && a.protocols?.some(pr => pr.toLowerCase().includes('unknown'))) hit = true
      if (p.cond === 'cloud_no_soc2' && a.env === 'Cloud' && a.controls?.soc2 !== 'pass') hit = true
      if (p.cond === 'phi_no_hipaa' && a.phi && a.controls?.hipaa !== 'pass') hit = true
      if (p.cond === 'fhir_no_hipaa' && a.protocols?.some(pr => pr.includes('FHIR')) && a.controls?.hipaa !== 'pass') hit = true
      if (hit) vs.push({ agent: a, policy: p })
    })
  })
  return vs
}

// Icon map for activity types
export const ACT_ICON = {
  discovery: '🔍', reg: '📋', alert: '⚠️', scan: '🔍', info: 'ℹ️', policy: '⚡', compliance: '✅'
}
export const ACT_BG = {
  discovery: 'var(--brand-bg)', reg: 'var(--green-bg)', alert: 'var(--red-bg)',
  scan: 'var(--brand-bg)', info: 'rgba(200,210,240,0.2)', policy: 'var(--amber-bg)', compliance: 'var(--green-bg)'
}

export function exportCSV(agents = []) {
  const h = ['Name', 'Type', 'Env', 'Protocols', 'DataAccess', 'LastSeen', 'Risk', 'Shadow', 'PII', 'PHI', 'Domain', 'SOC2', 'ISO27001', 'GDPR', 'NIST', 'EUAIAct', 'HIPAA', 'HITRUST', 'FDA_SaMD', 'Score']
  const rows = agents.map(a => [
    a.name || '',
    a.type || '',
    a.env || '',
    (a.protocols || []).join(';'),
    a.dataAccess || '',
    a.lastSeen || '',
    a.risk || '',
    a.shadow ? 'Yes' : 'No',
    a.pii ? 'Yes' : 'No',
    a.phi ? 'Yes' : 'No',
    a.domain || '',
    a.controls?.soc2 || '',
    a.controls?.iso27001 || '',
    a.controls?.gdpr || '',
    a.controls?.nist || '',
    a.controls?.euai || '',
    a.controls?.hipaa || '',
    a.controls?.hitrust || '',
    a.controls?.fda_samd || '',
    cscore(a.controls) + '%'
  ].map(v => `"${v}"`).join(','))
  
  const csvString = [h.join(','), ...rows].join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  
  // IE 10+ / Edge fallback
  if (navigator.msSaveBlob) { 
    navigator.msSaveBlob(blob, 'agentRadar-export.csv')
    return
  }
  
  const link = document.createElement('a')
  if (link.download !== undefined) { 
    const url = window.URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'agentRadar-export.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Defer revocation to ensure browser has time to register the download name
    setTimeout(() => {
      window.URL.revokeObjectURL(url)
    }, 500)
  } else {
    // Fallback for extremely old browsers
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString)
    window.open(csvContent, '_blank')
  }
}

// Nav view map
export const VM = {
  dashboard:     { title: 'Dashboard',                bc: '/dashboard' },
  discovery:     { title: 'Agent Discovery',           bc: '/discovery/all' },
  live:          { title: 'Live Detection',            bc: '/discovery/live' },
  shadow:        { title: 'Shadow AI',                 bc: '/discovery/shadow' },
  phi:           { title: 'PHI Exposure Monitor',      bc: '/discovery/phi' },
  models:        { title: 'Model Registry',            bc: '/discovery/models' },
  policy:        { title: 'Policy Engine',             bc: '/governance/policy' },
  approvals:     { title: 'Approvals',                 bc: '/governance/approvals' },
  compliance:    { title: 'Compliance Posture',        bc: '/governance/compliance' },
  playbooks:     { title: 'Remediation Playbooks',     bc: '/governance/playbooks' },
  risk:          { title: 'Risk & Analytics',          bc: '/intelligence/risk' },
  blast:         { title: 'Global Mesh',               bc: '/intelligence/mesh' },
  lineage:       { title: 'Data Lineage Map',          bc: '/intelligence/lineage' },
  integrations:  { title: 'Environment Connect Hub',   bc: '/integrations/connect' },
  ciso:          { title: 'CISO Report',               bc: '/reports/ciso' },
  benchmark:     { title: 'Peer Benchmarking',         bc: '/reports/benchmark' },
  notifications: { title: 'Notifications',             bc: '/notifications' },
  activity:      { title: 'Activity Log',              bc: '/ops/activity' },
  admin:         { title: 'Administration',            bc: '/admin' },
}
