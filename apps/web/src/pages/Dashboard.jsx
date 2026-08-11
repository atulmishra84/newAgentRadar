import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { cscore, computeViolations, ACT_ICON, ACT_BG } from '../lib/helpers'

// Frameworks for compliance mini-matrix
const FRAMEWORKS = [
  { key: 'soc2',    label: 'SOC 2' },
  { key: 'hipaa',   label: 'HIPAA' },
  { key: 'gdpr',    label: 'GDPR' },
  { key: 'euai',    label: 'EU AI Act' },
  { key: 'iso27001',label: 'ISO 27K' },
  { key: 'nist',    label: 'NIST' },
  { key: 'hitrust', label: 'HITRUST' },
  { key: 'fda_samd',label: 'FDA SaMD' },
]

export default function Dashboard() {
  const agents = useStore(s => s.agents)
  const policies = useStore(s => s.policies)
  const activity = useStore(s => s.activity)
  const openModal = useStore(s => s.openModal)
  const openAIPanel = useStore(s => s.openAIPanel)
  const quarantine = useStore(s => s.quarantine)
  const navigate = useNavigate()

  const A = agents
  const total = A.length
  const crit = A.filter(a => a.risk === 'critical').length
  const high = A.filter(a => a.risk === 'high').length
  const shadow = A.filter(a => a.shadow).length
  const phi = A.filter(a => a.phi).length
  const noBaa = A.filter(a => a.phi && a.controls?.hipaa === 'fail').length

  const violations = useMemo(() => computeViolations(A, policies), [A, policies])

  // Live alerts
  const alerts = useMemo(() => {
    const list = []
    A.forEach(a => {
      if (a.risk === 'critical' && a.shadow) list.push({ sev: 'critical', title: 'Critical shadow AI: ' + a.name, detail: a.dataAccess + ' — ' + a.detect, view: 'shadow', agent: a })
      if (a.phi && a.controls?.hipaa === 'fail' && !a.shadow) list.push({ sev: 'high', title: 'PHI without BAA: ' + a.name, detail: 'HIPAA violation — execute Business Associate Agreement immediately', view: 'phi', agent: a })
      if (a.controls?.gdpr === 'fail' && a.pii) list.push({ sev: 'high', title: 'GDPR violation: ' + a.name, detail: 'Agent accesses PII without GDPR controls passing', view: 'compliance', agent: a })
      if (a.shadow && a.risk === 'high') list.push({ sev: 'high', title: 'High-risk shadow: ' + a.name, detail: a.env + ' — ' + a.detect + ' · No governance registration', view: 'shadow', agent: a })
      if (a.controls?.euai === 'fail') list.push({ sev: 'medium', title: 'EU AI Act gap: ' + a.name, detail: 'Missing conformity assessment or human oversight requirement', view: 'compliance', agent: a })
    })
    const rank = { critical: 0, high: 1, medium: 2, low: 3 }
    return list.sort((a, b) => (rank[a.sev] || 3) - (rank[b.sev] || 3))
  }, [A])

  const sevColor = {
    critical: { dot: 'var(--red)', txt: 'var(--red-text)', bg: 'var(--red-bg)', brd: 'var(--red-border)' },
    high:     { dot: 'var(--amber)', txt: 'var(--amber-text)', bg: 'var(--amber-bg)', brd: 'var(--amber-border)' },
    medium:   { dot: 'var(--brand)', txt: 'var(--brand)', bg: 'var(--brand-bg)', brd: 'var(--brand-border)' },
  }

  // Risk bars data
  const riskData = [
    { label: 'Critical', count: crit, color: 'var(--red)' },
    { label: 'High',     count: high, color: 'var(--amber)' },
    { label: 'Medium',   count: A.filter(a => a.risk === 'medium').length, color: 'var(--brand)' },
    { label: 'Low',      count: A.filter(a => a.risk === 'low').length,    color: 'var(--green)' },
  ]

  // Environment bars
  const envData = [
    { label: 'Cloud',   count: A.filter(a => a.env === 'Cloud').length,   color: 'var(--brand)' },
    { label: 'On-Prem', count: A.filter(a => a.env === 'On-Prem').length, color: 'var(--purple)' },
    { label: 'Hybrid',  count: A.filter(a => a.env === 'Hybrid').length,  color: '#14b8a6' },
  ]

  // Domain bars
  const domainCounts = {}
  A.forEach(a => { const d = a.domain || 'General'; domainCounts[d] = (domainCounts[d] || 0) + 1 })
  const domainColors = { clinical: '#0ea5e9', healthcare: '#0ea5e9', pharmacy: '#10b981', radiology: '#6366f1', general: '#8b5cf6' }

  const viewRoute = { shadow: '/discovery/shadow', phi: '/discovery/phi', compliance: '/governance/compliance' }

  return (
    <div className="view-enter" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto' }}>

      {/* ── Hero Stat Cards ── */}
      <div id="s-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard color="brand" label="TOTAL AGENTS" id="s-total" value={total} sub="across all environments" trend="View all →" onClick={() => navigate('/discovery/all')} />
        <StatCard color="red" label="CRITICAL RISK" id="s-crit" value={crit} sub="need immediate action" trend={`${high} high risk`} />
        <StatCard color="amber" label="SHADOW AI" id="s-shadow" value={shadow} sub="unauthorized deployments" trend="View →" onClick={() => navigate('/discovery/shadow')} />
        <StatCard color="purple" label="PHI EXPOSURE" id="s-phi" value={phi} sub="accessing health data" trend={`${noBaa} no BAA`} onClick={() => navigate('/discovery/phi')} />
      </div>

      {/* ── Row 2: Alerts + Risk bars ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        {/* Live Alerts */}
        <div className="card">
          <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)' }}>
            <div className="card-title">Live Alerts</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className="tier-badge" style={{ background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red-border)', padding: '2px 8px', borderRadius: '12px', fontSize: 11, fontWeight: 700 }} id="dash-alert-count">
                {alerts.filter(a => a.sev === 'critical').length} critical
              </span>
              <button className="btn sm" onClick={() => navigate('/governance/policy')} style={{ background: 'transparent', border: '1px solid var(--glass-border)', fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>View all →</button>
            </div>
          </div>
          <div id="dash-alerts" style={{ padding: '16px 0' }}>
            {alerts.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No active alerts — governance posture is healthy
              </div>
            ) : (
              alerts.slice(0, 6).map((al, i) => {
                const c = sevColor[al.sev] || sevColor.medium
                return (
                  <div
                    key={i}
                    className="dash-alert-row"
                    onClick={() => navigate(viewRoute[al.view] || '/dashboard')}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 4,
                      padding: '12px 16px', cursor: 'pointer',
                      borderLeft: `2px solid ${c.dot}`,
                      margin: '0 24px 10px 24px',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{al.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{al.detail}</div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Breakdown charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">By Risk Level</div>
            </div>
            <div id="dash-risk-bars" style={{ padding: '16px 20px' }}>
              {riskData.map(r => (
                <BarRow key={r.label} label={r.label} count={r.count} max={total} color={r.color} />
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">By Environment</div>
            </div>
            <div id="dash-env-bars" style={{ padding: '12px 20px' }}>
              {envData.map(r => (
                <BarRow key={r.label} label={r.label} count={r.count} max={total} color={r.color} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Compliance Matrix + Domain + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Compliance mini matrix */}
        <div className="card">
          <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)' }}>
            <div className="card-title">Compliance Posture</div>
            <button className="btn sm" onClick={() => navigate('/governance/compliance')} style={{ background: 'transparent', border: '1px solid var(--glass-border)', fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>Full matrix →</button>
          </div>
          <div id="dash-comp-matrix" style={{ padding: '16px 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {FRAMEWORKS.map(fw => {
              const pass = A.filter(a => a.controls?.[fw.key] === 'pass').length
              const warn = A.filter(a => a.controls?.[fw.key] === 'warn').length
              const fail = A.filter(a => a.controls?.[fw.key] === 'fail').length
              const assessed = pass + fail
              const pct = assessed ? Math.round(pass / assessed * 100) : 0
              const warnPct = total ? Math.round(warn / total * 100) : 0
              const col = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'
              const display = assessed > 0 ? pct + '%' : warnPct > 0 ? 'Pending' : 'N/A'
              return (
                <div key={fw.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fw.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: col }}>{display}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)' }}>
            <div className="card-title">Recent Activity</div>
            <button className="btn sm" onClick={() => navigate('/ops/activity')} style={{ background: 'transparent', border: '1px solid var(--glass-border)', fontSize: 11, padding: '4px 10px', borderRadius: 8 }}>All activity →</button>
          </div>
          <div id="dash-activity" style={{ padding: '16px 0' }}>
            {activity.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
            ) : (
              activity.slice(0, 6).map((a, i) => {
                const cat = a.category || a.t || 'info'
                const msg = a.description || a.msg || a.t || 'Activity'
                const who = a.created_by || 'System'
                const when = a.created_at
                  ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                  : '17:09:59'
                return (
                  <div key={i} className="act-row" style={{ padding: '10px 24px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div className="act-icon" style={{ background: ACT_BG[cat] || 'var(--green)', width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0 }} />
                    <div className="act-body" style={{ flex: 1, minWidth: 0 }}>
                      <div className="act-title" style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg}</div>
                      <div className="act-meta" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{who} · {when}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Domain distribution + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head"><div className="card-title">By Domain</div></div>
            <div id="dash-domain-bars" style={{ padding: '12px 24px 24px' }}>
              {Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).map(([d, n]) => (
                <BarRow
                  key={d}
                  label={d || 'General'}
                  count={n}
                  max={total}
                  color={domainColors[d?.toLowerCase()] || 'var(--brand)'}
                  capitalize
                />
              ))}
              {Object.keys(domainCounts).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No agents registered yet</div>
              )}
            </div>
          </div>
          
          <div className="card">
            <div className="card-head"><div className="card-title">Quick Actions</div></div>
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
               <button className="btn" onClick={() => openModal('scan')} style={{ background: 'var(--brand)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ↻ Scan Now
               </button>
               <button className="btn" onClick={() => openModal('add-agent')} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  + Register Agent
               </button>
               <button className="btn" onClick={() => navigate('/intelligence/lineage')} style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✣ Lineage Map
               </button>
               <button className="btn" onClick={() => openAIPanel()} style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✦ AI Agent
               </button>
               <button className="btn" onClick={() => navigate('/reports/ciso')} style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  📄 CISO Report
               </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

/* ── Sub-components ─────────────────────────────── */
function StatCard({ color, label, value, sub, trend, onClick, id }) {
  // Map color to exact CSS vars matching index.html
  const cMap = {
    brand: { bg: 'var(--brand)', text: 'var(--brand)', trendBg: 'var(--brand-bg)', border: 'rgba(99,102,241,0.25)', tBorder: 'var(--brand-border)' },
    red: { bg: 'var(--red)', text: 'var(--red-text)', trendBg: 'var(--red-bg)', border: 'rgba(239,68,68,0.2)', tBorder: 'var(--red-border)' },
    amber: { bg: 'var(--amber)', text: 'var(--amber-text)', trendBg: 'var(--amber-bg)', border: 'rgba(245,158,11,0.22)', tBorder: 'var(--amber-border)' },
    purple: { bg: 'var(--purple)', text: 'var(--purple)', trendBg: 'var(--purple-bg)', border: 'rgba(139,92,246,0.22)', tBorder: 'var(--purple-border)' },
  }
  const c = cMap[color] || cMap.brand

  return (
    <div
      className="dash-hero-card"
      style={{
        position: 'relative',
        padding: '18px 20px',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${c.border}`,
        borderRadius: 16,
        boxShadow: '0 8px 30px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,1)',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden'
      }}
      onClick={onClick}
    >
      <div className="card-glow" style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, background: c.bg, borderRadius: '50%', filter: 'blur(28px)', opacity: 0.15 }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
      <div id={id} style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: c.text, lineHeight: 1, marginBottom: 8, letterSpacing: -1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{sub}</div>}
      {trend && (
        <span style={{
          position: 'absolute', top: 18, right: 18,
          background: c.trendBg, color: c.text, border: `1px solid ${c.tBorder}`,
          padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600
        }}>{trend}</span>
      )}
    </div>
  )
}

function BarRow({ label, count, max, color, capitalize }) {
  const pct = max ? Math.round(count / max * 100) : 0
  return (
    <div className="bar-row">
      <span className="bar-label" style={{ textTransform: capitalize ? 'capitalize' : undefined }}>{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: pct + '%', background: color }} />
      </div>
      <span className="bar-count">{count}</span>
    </div>
  )
}
