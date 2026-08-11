import { useState } from 'react'
import useStore from '../../store/useStore'
import { computeViolations } from '../../lib/helpers'

const FW_LABELS = { soc2: 'SOC 2', iso27001: 'ISO 27001', gdpr: 'GDPR', nist: 'NIST AI RMF', euai: 'EU AI Act', hipaa: 'HIPAA' }

function detectLLM(a) {
  const n = (a.name || '').toLowerCase(), m = JSON.stringify(a.metadata || {}).toLowerCase()
  if (n.includes('openai') || m.includes('openai')) return { name: 'OpenAI', model: 'GPT-4o', color: '#10a37f', icon: 'openai' }
  if (n.includes('claude') || m.includes('anthropic')) return { name: 'Anthropic', model: 'Claude', color: '#ff6b35', icon: 'anthropic' }
  if (n.includes('gemini') || m.includes('gemini')) return { name: 'Google', model: 'Gemini', color: '#4285f4', icon: 'google' }
  if (n.includes('copilot') || m.includes('copilot')) return { name: 'Microsoft', model: 'Copilot', color: '#0078d4', icon: 'microsoft' }
  if (n.includes('llama') || m.includes('llama')) return { name: 'Meta', model: 'Llama 3', color: '#0668E1', icon: 'meta' }
  return { name: 'Azure OpenAI', model: 'LLM', color: '#0078d4', icon: 'azure' }
}

function deriveAnatomy(a) {
  const proto = a.protocols || []
  const ctrl = a.controls || {}
  const users = []
  if (a.owner) users.push({ name: a.owner, type: 'Owner', role: 'Owner' })
  users.push({ name: 'Platform Admin', type: 'Role', role: 'Admin Access' })
  users.push({ name: 'Security Analyst', type: 'Role', role: 'Read Access' })
  if (a.shadow) users.push({ name: 'Unknown Principal', type: 'Unregistered', role: 'Uncontrolled' })
  
  const channels = []
  proto.forEach(p => channels.push({ name: p, type: 'Protocol', external: ['HTTP', 'REST', 'HTTPS', 'FHIR'].includes(p) }))
  if ((a.name || '').toLowerCase().includes('email')) channels.push({ name: 'Email', type: 'Channel', external: true })
  if ((a.name || '').toLowerCase().includes('slack')) channels.push({ name: 'Slack', type: 'SaaS', external: true })
  if (!channels.length) channels.push({ name: 'API Endpoint', type: 'REST', external: false })
  
  const actions = []
  if (ctrl.hipaa !== undefined) actions.push({ name: 'health_data_access', risk: ctrl.hipaa === 'fail' ? 'high' : 'low' })
  if (ctrl.gdpr !== undefined) actions.push({ name: 'pii_processing', risk: ctrl.gdpr === 'fail' ? 'high' : 'medium' })
  actions.push({ name: 'read_agent_config', risk: 'low' })
  if (a.shadow) actions.push({ name: 'unregistered_exec', risk: 'critical' })
  actions.push({ name: 'write_audit_log', risk: 'low' })
  
  const data = []
  if (a.phi) {
    data.push({ name: 'PHI Data Store', type: 'Database', phi: true, access: 'Read/Write' })
    data.push({ name: 'Healthcare Records', type: 'Regulated', phi: true, access: 'Read' })
  }
  if (a.pii) data.push({ name: 'PII Database', type: 'Database', phi: false, pii: true, access: 'Read' })
  if (a.dataAccess) data.push({ name: a.dataAccess, type: 'Configured', phi: a.phi, access: 'Read' })
  if (!data.length) {
    data.push({ name: 'Operational DB', type: 'Internal', phi: false, access: 'Read' })
    data.push({ name: 'Config Store', type: 'Internal', phi: false, access: 'Read' })
  }
  return { users, channels, actions, data }
}

function calcInherentRisk(a, anatomy) {
  const dims = {}; let score = 0
  const hasUnknown = anatomy.users.some(u => u.type === 'Unregistered')
  if (hasUnknown) { dims.users = { label: 'Users & Input', score: 4, reason: 'Unregistered principal detected', pct: 90, color: '#ef4444' }; score += 4 }
  else if (anatomy.users.length > 3) { dims.users = { label: 'Users & Input', score: 2, reason: anatomy.users.length + ' principals', pct: 50, color: '#f59e0b' }; score += 2 }
  else { dims.users = { label: 'Users & Input', score: 1, reason: anatomy.users.length + ' controlled principals', pct: 25, color: '#10b981' }; score += 1 }
  
  const phiD = anatomy.data.filter(d => d.phi || d.pii)
  if (phiD.length) { dims.data = { label: 'Data', score: 4, reason: phiD.length + ' PHI/PII source(s)', pct: 95, color: '#ef4444' }; score += 4 }
  else if (anatomy.data.length > 3) { dims.data = { label: 'Data', score: 2, reason: 'Broad data access', pct: 55, color: '#f59e0b' }; score += 2 }
  else { dims.data = { label: 'Data', score: 1, reason: 'Limited data access', pct: 20, color: '#10b981' }; score += 1 }
  
  const critA = anatomy.actions.filter(ac => ac.risk === 'critical' || ac.risk === 'high')
  if (critA.length) { dims.actions = { label: 'Actions', score: 3, reason: critA.length + ' high-risk action(s)', pct: 75, color: '#ef4444' }; score += 3 }
  else { dims.actions = { label: 'Actions', score: 1, reason: 'Standard action scope', pct: 25, color: '#10b981' }; score += 1 }
  
  const extC = anatomy.channels.filter(c => c.external)
  if (extC.length > 1) { dims.channels = { label: 'Channels', score: 2, reason: extC.length + ' external channel(s)', pct: 50, color: '#f59e0b' }; score += 2 }
  else { dims.channels = { label: 'Channels', score: 1, reason: 'Internal only', pct: 20, color: '#10b981' }; score += 1 }
  
  const level = score >= 10 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low'
  const levelColor = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' }[level]
  return { score, level, levelColor, dims }
}

export default function AgentDrawer() {
  const { drawerAgentId, closeDrawer, agents, policies } = useStore()
  const [tab, setTab] = useState('anatomy')

  if (!drawerAgentId) return null
  const agent = agents.find(a => a.id === drawerAgentId)
  if (!agent) return null

  const anatomy = deriveAnatomy(agent)
  const risk = calcInherentRisk(agent, anatomy)
  const ctrl = agent.controls || {}
  const vs = computeViolations(agents, policies).filter(v => v.agent.id === agent.id)

  return (
    <>
      <div id="drawer-backdrop" className="open" onClick={closeDrawer} />
      <div id="drawer" className="open">
        <div id="drw-inner">
          
          <div className="drw2-header">
            <div className="drw2-back" onClick={closeDrawer}>&larr; Agents /</div>
            <div style={{ marginLeft: 6 }}>
              <div className="drw2-title">{agent.name}</div>
              <div className="drw2-subtitle">Owner: {agent.owner || 'Unassigned'}</div>
            </div>
            {(agent.risk === 'critical' || agent.shadow) && <div className="drw2-flag">FLAGGED</div>}
            <div className="drw2-close" onClick={closeDrawer}>✕</div>
          </div>

          <div className="drw2-tabs">
            {['anatomy', 'riskprofile', 'residual', 'sessions'].map(t => (
              <div key={t} className={`drw2-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.toUpperCase()}
                <small>{t === 'anatomy' ? 'Agent connections and users' : t === 'riskprofile' ? 'Inherent risk of the agent' : t === 'residual' ? 'Remaining risk after controls' : 'All agent conversations'}</small>
              </div>
            ))}
          </div>

          <div className="drw2-body">
            {/* Left Sidebar */}
            <div className="drw2-left">
              <div className="drw2-fn-label">FUNCTION: {(agent.env || agent.type || 'AI AGENT').toUpperCase()}</div>
              <div className="drw2-fn-desc">{(agent.notes || 'AI agent registered in AgentRadar.').substring(0, 120)}</div>
              
              <div className="drw2-lbl">OWNER</div>
              <div className="drw2-owner">
                <div className="drw2-owner-av">{(agent.owner || '?')[0].toUpperCase()}</div>
                {agent.owner || 'Unassigned'}
              </div>

              <div className="drw2-lbl">BOUNDARIES</div>
              <div className="drw2-boundary"><span className="drw2-boundary-name">Registered Agents</span><span className="drw2-boundary-ctrl">{Object.keys(ctrl).length} Controls ›</span></div>
              <div className="drw2-boundary"><span className="drw2-boundary-name">{agent.env || 'Production'}</span><span className="drw2-boundary-ctrl">{Object.values(ctrl).filter(v => v === 'pass').length} Controls ›</span></div>

              <div className="drw2-lbl">AGENT DATA</div>
              <div className="drw2-kv"><span className="drw2-kv-k">Agent Type</span><span className="drw2-kv-v">{agent.type || 'agent'}</span></div>
              <div className="drw2-kv"><span className="drw2-kv-k">Environment</span><span className="drw2-kv-v">{agent.env || 'Cloud'}</span></div>
              <div className="drw2-kv"><span className="drw2-kv-k">Location</span><span className="drw2-kv-v">{agent.region || 'Azure East US'}</span></div>
              <div className="drw2-kv"><span className="drw2-kv-k">Mode</span><span className="drw2-kv-v">{agent.shadow ? 'Shadow' : 'Registered'}</span></div>
              <div className="drw2-kv" style={{ border: 'none' }}><span className="drw2-kv-k">PHI</span><span className="drw2-kv-v" style={{ color: agent.phi ? '#ef4444' : '#10b981' }}>{agent.phi ? '⚕ Detected' : 'None'}</span></div>
            </div>

            {/* Right Content Area */}
            <div className="drw2-right">
              {tab === 'anatomy' && (
                <div className="anatomy-tab-content active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  Interactive SVG Anatomy View is loading...
                </div>
              )}

              {tab === 'riskprofile' && (
                <div className="anatomy-tab-content active" style={{ padding: 20 }}>
                  <div className="risk-profile-grid">
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#6b7280', letterSpacing: 1, marginBottom: 8 }}>INHERENT RISK SCORE</div>
                      <div className="inherent-risk-badge" style={{ background: `${risk.levelColor}18`, border: `1px solid ${risk.levelColor}40`, color: risk.levelColor }}>
                        {risk.level.toUpperCase()} RISK — Score {risk.score}/16
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>Calculated from the agent's anatomy before controls are applied.</div>
                    </div>
                    {Object.values(risk.dims).map(d => (
                      <div key={d.label} className="risk-dim">
                        <div className="risk-dim-head">
                          <span className="risk-dim-name">{d.label}</span>
                          <span className="risk-dim-score" style={{ background: `${d.color}18`, color: d.color }}>{d.score}/4</span>
                        </div>
                        <div className="risk-dim-bar"><div className="risk-dim-bar-fill" style={{ width: `${d.pct}%`, background: d.color }} /></div>
                        <div className="risk-dim-reason">{d.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'residual' && (
                <div className="anatomy-tab-content active" style={{ padding: 20 }}>
                  <div className="residual-grid">
                    <div className="drw2-lbl">COMPLIANCE CONTROLS</div>
                    {Object.entries(ctrl).map(([k, v]) => {
                      const col = v === 'pass' ? '#10b981' : v === 'fail' ? '#ef4444' : '#f59e0b'
                      const bg = v === 'pass' ? 'rgba(16,185,129,0.15)' : v === 'fail' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'
                      return (
                        <div key={k} className="fw-row">
                          <div className="fw-icon" style={{ background: bg, color: col }}>{v === 'pass' ? '✓' : v === 'fail' ? '✗' : '~'}</div>
                          <span className="fw-name">{FW_LABELS[k] || k}</span>
                          <span className="fw-status" style={{ color: col }}>{v === 'pass' ? 'Compliant' : v === 'fail' ? 'Non-compliant' : 'Not assessed'}</span>
                        </div>
                      )
                    })}
                    {vs.length > 0 && (
                      <>
                        <div style={{ marginTop: 14, fontSize: 10, color: '#6b7280', letterSpacing: 1, marginBottom: 8 }}>ACTIVE VIOLATIONS ({vs.length})</div>
                        {vs.map((v, i) => (
                          <div key={i} style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#fca5a5', fontWeight: 600, marginBottom: 5 }}>
                            ⚠ {v.policy.name}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === 'sessions' && (
                <div className="anatomy-tab-content active" style={{ padding: 20 }}>
                  <div className="drw2-lbl">AGENT ACTIVITY LOG</div>
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    Sessions log loaded from SIEM.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
