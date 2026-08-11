import { useState, useMemo } from 'react'
import useStore from '../store/useStore'

export default function ShadowAI() {
  const agents = useStore(s => s.agents)
  const quarantine = useStore(s => s.quarantine)
  const openDrawer = useStore(s => s.openDrawer)
  
  const shadows = useMemo(() => agents.filter(a => a.shadow), [agents])

  const piiExposed = shadows.filter(a => a.pii).length
  const riskScoreMap = { critical: 95, high: 75, medium: 50, low: 25 }
  const avgRiskScore = shadows.length > 0 
    ? Math.round(shadows.reduce((acc, a) => acc + (riskScoreMap[a.risk] || 50), 0) / shadows.length) 
    : 0
  const detectionMethods = new Set(shadows.map(a => a.detect).filter(Boolean)).size

  return (
    <div className="view-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Red Warning Banner */}
      <div style={{
        margin: '24px 24px 0 24px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 8,
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 4
      }}>
        <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>
          ⚠ Unauthorized AI deployments detected in your environments
        </div>
        <div style={{ color: '#6b7280', fontSize: 12 }}>
          Shadow agents operate outside approved governance. They may process sensitive data without consent agreements, audit trails, or security controls.
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        margin: '16px 24px 0 24px'
      }}>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #ef4444', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>SHADOW AGENTS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{shadows.length}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #ef4444', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>PII EXPOSED</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{piiExposed}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>AVG RISK SCORE</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{avgRiskScore}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #8b5cf6', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>DETECTION METHODS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{detectionMethods}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ margin: '16px 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Shadow AI Registry</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{shadows.length} unregistered</div>
        </div>
        
        <div className="tbl-wrap" style={{ flex: 1, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Agent</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Detection</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Environment</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Data Access</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>First Detected</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Risk</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shadows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                    {agents.length === 0 ? 'No agents registered — run a scan to detect shadow AI' : 'No shadow AI detected with current filters ✓'}
                  </td>
                </tr>
              ) : shadows.map(a => {
                const formattedDate = a.first_detected ? a.first_detected.split('T')[0] : '--';
                
                return (
                  <tr key={a.id} onClick={() => openDrawer(a.id)}>
                    <td style={{ borderLeft: '3px solid #ef4444', paddingLeft: 12 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.name}</span>
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{a.detect || '--'}</td>
                    <td>
                      {a.env ? (
                        <span style={{ background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
                          {a.env}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.data_access || <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}</td>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{formattedDate}</td>
                    <td>
                      {a.risk ? (
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                          {a.risk}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button 
                        style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '4px 12px', borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => quarantine(a.id)}
                      >
                        Quarantine
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '4px 12px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                        SHADOW
                      </span>
                    </td>
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
