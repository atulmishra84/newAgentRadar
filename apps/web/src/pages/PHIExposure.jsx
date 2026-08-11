import { useMemo } from 'react'
import useStore from '../store/useStore'

export default function PHIExposure() {
  const agents = useStore(s => s.agents)
  const openDrawer = useStore(s => s.openDrawer)

  const phi = useMemo(() => agents.filter(a => a.phi), [agents])
  const noBaa = phi.filter(a => a.baa_status !== 'signed').length || 0
  const unencrypted = phi.filter(a => a.controls?.encryption === 'fail').length || 0
  const hipaaCompliant = phi.filter(a => a.controls?.hipaa === 'pass').length || 0

  const formatDate = (ds) => {
    if (!ds) return '22/06/2026, 17:23:11'
    const d = new Date(ds)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  return (
    <div className="view-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Pink Warning Banner */}
      <div style={{
        margin: '24px 24px 0 24px',
        background: '#fce7f3',
        border: '1px solid #fbcfe8',
        borderRadius: 8,
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 4
      }}>
        <div style={{ fontWeight: 700, color: '#e11d48', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          🏥 Protected Health Information (PHI) Exposure Monitor
        </div>
        <div style={{ color: '#6b7280', fontSize: 12 }}>
          Tracks which AI agents are accessing, processing, or transmitting PHI. HIPAA requires Business Associate Agreements (BAA) for all AI systems handling PHI.
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        margin: '16px 24px 0 24px'
      }}>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #ef4444', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>PHI AGENTS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{phi.length}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #ef4444', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>NO BAA</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{noBaa}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>UNENCRYPTED PHI</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{unencrypted}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #10b981', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>HIPAA COMPLIANT</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{hipaaCompliant}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ margin: '16px 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>PHI Agent Registry</div>
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '4px 12px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>Healthcare</div>
        </div>
        
        <div className="tbl-wrap" style={{ flex: 1, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Agent</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Domain</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Protocols</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>BAA Status</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Encryption</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>HIPAA Score</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Audit Log</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {phi.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                    No PHI-accessing agents detected
                  </td>
                </tr>
              ) : phi.map(a => (
                <tr key={a.id} onClick={() => openDrawer(a.id)}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.name}</span>
                  </td>
                  <td style={{ color: '#9ca3af', fontSize: 12 }}>{a.env || '--'}</td>
                  <td style={{ color: '#9ca3af', fontSize: 12 }}>
                    {a.protocols?.length ? a.protocols.join(', ') : '--'}
                  </td>
                  <td>
                    <span style={{ color: a.baa_status === 'signed' ? '#16a34a' : '#f59e0b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>
                      {a.baa_status || '--'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: a.controls?.encryption === 'pass' ? '#16a34a' : '#f59e0b', fontWeight: 600, fontSize: 11 }}>
                      {a.controls?.encryption ? a.controls.encryption.toUpperCase() : '--'}
                    </span>
                  </td>
                  <td style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>
                    {a.controls?.hipaa ? a.controls.hipaa.toUpperCase() : '--'}
                  </td>
                  <td style={{ color: '#9ca3af', fontSize: 12 }}>{formatDate(a.last_seen)}</td>
                  <td>
                    {a.risk ? (
                      <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        {a.risk}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
