import { useMemo } from 'react'
import useStore from '../store/useStore'
import { cscore } from '../lib/helpers'

export default function Benchmark() {
  const agents = useStore(s => s.agents)

  const stats = useMemo(() => {
    if (!agents.length) return { myA: 0, secA: 67, peerP: 0, bms: [] }

    const myA = Math.round(agents.reduce((acc, a) => acc + cscore(a.controls), 0) / agents.length)
    const secA = 67
    // Simple mock math for percentile based on sector avg (50th percentile)
    const peerP = Math.min(99, Math.round((myA / secA) * 50))

    const pct = k => {
      const passing = agents.filter(a => a.controls?.[k] === 'pass').length
      return Math.round((passing / agents.length) * 100)
    }

    const bms = [
      { fw: 'SOC 2 Type II', y: pct('soc2'), s: 78, t: 95, hc: false },
      { fw: 'ISO 27001:2022', y: pct('iso27001'), s: 72, t: 94, hc: false },
      { fw: 'GDPR / DPA', y: pct('gdpr'), s: 65, t: 92, hc: false },
      { fw: 'NIST AI RMF', y: pct('nist'), s: 51, t: 87, hc: false },
      { fw: 'EU AI Act', y: pct('euai'), s: 44, t: 82, hc: false },
      { fw: 'HIPAA 🏥', y: pct('hipaa'), s: 71, t: 91, hc: true },
      { fw: 'HITRUST CSF 🏥', y: pct('hitrust'), s: 58, t: 88, hc: true },
      { fw: 'FDA SaMD 🏥', y: pct('fda_samd'), s: 42, t: 79, hc: true },
    ]

    return { myA, secA, peerP, bms }
  }, [agents])

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* Top Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {/* Industry Percentile */}
          <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'var(--purple)', filter: 'blur(50px)', opacity: 0.15 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Industry Percentile</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--purple)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
              {stats.peerP}th
            </div>
          </div>
          
          {/* Above Sector Avg */}
          <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'var(--blue)', filter: 'blur(50px)', opacity: 0.15 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Above Sector Avg</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
              {Math.max(0, Math.round((100 - stats.peerP) * 0.8))}%
            </div>
          </div>

          {/* Sector Average */}
          <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'var(--green)', filter: 'blur(50px)', opacity: 0.15 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Sector Average</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
              {stats.secA}%
            </div>
          </div>

          {/* Your Score */}
          <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: 'var(--amber)', filter: 'blur(50px)', opacity: 0.15 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Your Score</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--amber)', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
              {stats.myA}%
            </div>
          </div>
        </div>

        {/* Framework List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,210,240,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Framework Benchmarks vs Sector</div>
            <div style={{ fontSize: 10, fontWeight: 700, background: 'var(--brand)', color: 'white', padding: '3px 8px', borderRadius: 99 }}>Tier 5</div>
          </div>
          
          <div style={{ padding: '20px 24px' }}>
            {stats.bms.map((b, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: b.hc ? 'var(--blue)' : 'var(--text-primary)' }}>{b.fw}</span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sector {b.s}%</span>
                    <span style={{ color: 'var(--blue)' }}>Top {b.t}%</span>
                    <span style={{ color: b.y >= b.s ? 'var(--green)' : 'var(--red)' }}>
                      {b.y >= b.s ? '↑' : '↓'} You {b.y}%
                    </span>
                  </div>
                </div>
                
                {/* Custom Track Bar */}
                <div style={{ height: 8, background: 'rgba(200,210,240,0.1)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${b.t}%`, background: 'rgba(59,130,246,0.3)', borderRadius: 4 }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${b.s}%`, background: 'rgba(245,158,11,0.5)', borderRadius: 4 }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${b.y}%`, background: b.y >= b.s ? 'linear-gradient(90deg,var(--green),#34d399)' : 'linear-gradient(90deg,var(--red),#f87171)', borderRadius: 4, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
