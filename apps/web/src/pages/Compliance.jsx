import useStore from '../store/useStore'
import { cscore } from '../lib/helpers'

const FRAMEWORKS = [
  { key: 'soc2',     label: 'SOC 2 Type II',         icon: '🔐', desc: 'Security, availability, confidentiality' },
  { key: 'hipaa',    label: 'HIPAA',                  icon: '🏥', desc: 'Health data protection standards' },
  { key: 'gdpr',     label: 'GDPR',                   icon: '🇪🇺', desc: 'EU personal data regulation' },
  { key: 'euai',     label: 'EU AI Act',              icon: '⚖️', desc: 'High-risk AI system compliance' },
  { key: 'iso27001', label: 'ISO 27001',              icon: '📋', desc: 'Information security management' },
  { key: 'nist',     label: 'NIST AI RMF',            icon: '🏛️', desc: 'Risk management framework' },
  { key: 'hitrust',  label: 'HITRUST CSF',            icon: '🛡️', desc: 'Healthcare security framework' },
  { key: 'fda_samd', label: 'FDA SaMD',               icon: '💊', desc: 'Software as Medical Device' },
]

function compliancePct(agents, key) {
  const assessed = agents.filter(a => a.controls?.[key] && a.controls[key] !== 'warn')
  if (!assessed.length) return null
  const pass = assessed.filter(a => a.controls[key] === 'pass').length
  return Math.round(pass / assessed.length * 100)
}

function statusBand(pct) {
  if (pct === null) return { color: 'var(--text-muted)', bg: 'rgba(200,210,240,0.2)', label: 'N/A', brd: 'rgba(200,210,240,0.4)' }
  if (pct >= 80) return { color: 'var(--green-text)', bg: 'var(--green-bg)', label: 'Compliant', brd: 'var(--green-border)' }
  if (pct >= 50) return { color: 'var(--amber-text)', bg: 'var(--amber-bg)', label: 'Partial', brd: 'var(--amber-border)' }
  return { color: 'var(--red-text)', bg: 'var(--red-bg)', label: 'Non-compliant', brd: 'var(--red-border)' }
}

export default function Compliance() {
  const agents = useStore(s => s.agents)

  const overallPct = agents.length === 0 ? 0 : Math.round(
    FRAMEWORKS.reduce((sum, fw) => sum + (compliancePct(agents, fw.key) ?? 0), 0) / FRAMEWORKS.length
  )

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Hero */}
      <div className="card" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>Overall Compliance Posture</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 800, letterSpacing: -2, color: overallPct >= 80 ? 'var(--green-text)' : overallPct >= 50 ? 'var(--amber-text)' : 'var(--red-text)' }}>
            {overallPct}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>across {FRAMEWORKS.length} frameworks · {agents.length} agents</div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="bar-track" style={{ height: 10, borderRadius: 5, marginBottom: 8 }}>
            <div className="bar-fill" style={{ width: overallPct + '%', height: '100%', background: overallPct >= 80 ? 'var(--green)' : overallPct >= 50 ? 'var(--amber)' : 'var(--red)', borderRadius: 5 }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>✅ {agents.filter(a => cscore(a.controls) >= 80).length} agents compliant</span>
            <span>⚠ {agents.filter(a => { const s = cscore(a.controls); return s >= 50 && s < 80 }).length} partial</span>
            <span>❌ {agents.filter(a => cscore(a.controls) < 50).length} non-compliant</span>
          </div>
        </div>
      </div>

      {/* Framework matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {FRAMEWORKS.map(fw => {
          const pct = compliancePct(agents, fw.key)
          const { color, bg, label, brd } = statusBand(pct)
          const pass  = agents.filter(a => a.controls?.[fw.key] === 'pass').length
          const fail  = agents.filter(a => a.controls?.[fw.key] === 'fail').length
          const warn  = agents.filter(a => a.controls?.[fw.key] === 'warn').length

          return (
            <div key={fw.key} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 24 }}>{fw.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{fw.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{fw.desc}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color, letterSpacing: -1, marginBottom: 6 }}>
                {pct !== null ? pct + '%' : 'N/A'}
              </div>
              <div className="bar-track" style={{ marginBottom: 10 }}>
                <div className="bar-fill" style={{ width: (pct ?? 0) + '%', background: color.replace('text)', ')').replace('var(--', 'var(--') }} />
              </div>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: bg, color, border: `1px solid ${brd}`, marginBottom: 10 }}>
                {label}
              </span>
              <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                <span style={{ color: 'var(--green-text)' }}>✓ {pass}</span>
                <span style={{ color: 'var(--amber-text)' }}>~ {warn}</span>
                <span style={{ color: 'var(--red-text)' }}>✗ {fail}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Agent compliance table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', fontWeight: 700, fontSize: 13 }}>Agent Compliance Detail</div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Score</th>
                {FRAMEWORKS.map(fw => <th key={fw.key}>{fw.label.split(' ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr><td colSpan={FRAMEWORKS.length + 2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>No agents registered yet</td></tr>
              ) : agents.map(a => {
                const score = cscore(a.controls)
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12 }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.env}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="bar-track" style={{ width: 60 }}>
                          <div className="bar-fill" style={{ width: score + '%', background: score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: score >= 80 ? 'var(--green-text)' : score >= 50 ? 'var(--amber-text)' : 'var(--red-text)' }}>{score}%</span>
                      </div>
                    </td>
                    {FRAMEWORKS.map(fw => {
                      const val = a.controls?.[fw.key]
                      return (
                        <td key={fw.key} style={{ textAlign: 'center' }}>
                          <span className={`check-c ${val === 'pass' ? 'cc-p' : val === 'warn' ? 'cc-w' : val === 'fail' ? 'cc-f' : ''}`} style={{ fontSize: 9 }}>
                            {val === 'pass' ? '✓' : val === 'warn' ? '~' : val === 'fail' ? '✗' : '—'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
