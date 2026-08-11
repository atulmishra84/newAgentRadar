import { useMemo } from 'react'
import useStore from '../store/useStore'
import { computeViolations, cscore } from '../lib/helpers'

export default function Risk() {
  const agents = useStore(s => s.agents)
  const risks  = useStore(s => s.risks)
  const policies = useStore(s => s.policies)

  const violations = useMemo(() => computeViolations(agents, policies), [agents, policies])

  const A = agents
  const riskDist = {
    critical: A.filter(a => a.risk === 'critical').length,
    high:     A.filter(a => a.risk === 'high').length,
    medium:   A.filter(a => a.risk === 'medium').length,
    low:      A.filter(a => a.risk === 'low').length,
  }
  const maxRisk = Math.max(...Object.values(riskDist), 1)

  const envDist = {
    'Cloud':   A.filter(a => a.env === 'Cloud').length,
    'On-Prem': A.filter(a => a.env === 'On-Prem').length,
    'Hybrid':  A.filter(a => a.env === 'Hybrid').length,
  }

  const catCounts = {}
  risks.forEach(r => { catCounts[r.cat] = (catCounts[r.cat] || 0) + 1 })
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1])
  const maxCat = sortedCats[0]?.[1] || 1

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {[
          { label: 'Risk Items', value: risks.length, color: 'var(--red)' },
          { label: 'Critical', value: riskDist.critical, color: 'var(--red)' },
          { label: 'High', value: riskDist.high, color: 'var(--amber)' },
          { label: 'Violations', value: violations.length, color: 'var(--amber)' },
          { label: 'Avg Score', value: A.length ? Math.round(A.reduce((s, a) => s + cscore(a.controls), 0) / A.length) + '%' : '—', color: 'var(--brand)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Risk distribution bar chart */}
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', fontWeight: 700, fontSize: 13 }}>Risk Distribution</div>
          <div style={{ padding: 20 }}>
            {Object.entries(riskDist).map(([level, count]) => {
              const colors = { critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--brand)', low: 'var(--green)' }
              return (
                <div key={level} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{level}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: colors[level] }}>{count}</span>
                  </div>
                  <div className="bar-track" style={{ height: 8, borderRadius: 4 }}>
                    <div className="bar-fill" style={{ width: (count / maxRisk * 100) + '%', background: colors[level], height: '100%', borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Risk by category */}
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', fontWeight: 700, fontSize: 13 }}>Risk Categories</div>
          <div style={{ padding: 20 }}>
            {sortedCats.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 20 }}>No risk items</div>
            ) : sortedCats.map(([cat, count]) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cat}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                </div>
                <div className="bar-track" style={{ height: 6, borderRadius: 3 }}>
                  <div className="bar-fill" style={{ width: (count / maxCat * 100) + '%', background: 'var(--brand)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environment distribution */}
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', fontWeight: 700, fontSize: 13 }}>By Environment</div>
          <div style={{ padding: 20 }}>
            {Object.entries(envDist).map(([env, count]) => {
              const col = env === 'Cloud' ? 'var(--brand)' : env === 'On-Prem' ? 'var(--purple)' : '#14b8a6'
              return (
                <div key={env} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{env}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{count}</span>
                  </div>
                  <div className="bar-track" style={{ height: 8, borderRadius: 4 }}>
                    <div className="bar-fill" style={{ width: A.length ? (count / A.length * 100) + '%' : '0%', background: col, height: '100%', borderRadius: 4 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Risk register table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', fontWeight: 700, fontSize: 13 }}>Risk Register ({risks.length} items)</div>
        <div style={{ overflowY: 'auto', maxHeight: 320 }}>
          <table>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Category</th>
                <th>Level</th>
                <th>Description</th>
                <th>Linked Agent</th>
              </tr>
            </thead>
            <tbody>
              {risks.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0' }}>No risks registered</td></tr>
              ) : risks.map(r => {
                const agent = agents.find(a => a.id === r.aid)
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</td>
                    <td><span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>{r.cat}</span></td>
                    <td><span className={`rtag rt-${r.level}`}>{r.level}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{agent?.name || `Agent #${r.aid}`}</td>
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
