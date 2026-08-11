import { useState, useEffect } from 'react'
import useStore from '../store/useStore'

const SEV_COLOR = { critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--brand)', low: 'var(--green)' }
const SEV_BG    = { critical: 'var(--red-bg)', high: 'var(--amber-bg)', medium: 'var(--brand-bg)', low: 'var(--green-bg)' }

export default function Playbooks() {
  const [expanded, setExpanded] = useState(null)
  const [executed, setExecuted] = useState({})
  
  const playbooks = useStore(s => s.playbooks)
  const fetchPlaybooks = useStore(s => s.fetchPlaybooks)
  const executePlaybook = useStore(s => s.executePlaybook)

  useEffect(() => {
    fetchPlaybooks()
  }, [fetchPlaybooks])

  function execute(pb) {
    setExecuted(e => ({ ...e, [pb.id]: true }))
    executePlaybook(pb.id, null, pb.name)
  }

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
        {playbooks.map(pb => {
          const isOpen = expanded === pb.id
          const isDone = executed[pb.id]
          const steps = typeof pb.steps === 'string' ? JSON.parse(pb.steps || '[]') : (pb.steps || [])
          const tags = typeof pb.tags === 'string' ? JSON.parse(pb.tags || '[]') : (pb.tags || [])
          
          return (
            <div key={pb.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isOpen ? `1px solid ${SEV_COLOR[pb.severity]}40` : undefined }}>
              {/* Header */}
              <div
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', borderLeft: `3px solid ${SEV_COLOR[pb.severity]}` }}
                onClick={() => setExpanded(isOpen ? null : pb.id)}
              >
                <span style={{ fontSize: 20 }}>{pb.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 }}>{pb.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 99, background: SEV_BG[pb.severity], color: SEV_COLOR[pb.severity] }}>
                      {pb.severity}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>SLA: {pb.description}</span>
                    {pb.auto_execute && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--brand)' }}>⚡ Automated</span>}
                    {isDone && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green-text)' }}>✅ Executed</span>}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M2 4l4 4 4-4" strokeLinecap="round"/>
                </svg>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid rgba(200,210,240,0.3)' }}>
                  <div style={{ paddingTop: 14, marginBottom: 12 }}>
                    {steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--brand)', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 3 }}>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ fontSize: 10, background: 'rgba(200,210,240,0.2)', padding: '2px 8px', borderRadius: 6, color: 'var(--text-secondary)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <button
                    className={`btn ${isDone ? 'success' : 'primary'}`}
                    style={{ width: '100%' }}
                    onClick={() => execute(pb)}
                    disabled={isDone}
                  >
                    {isDone ? '✅ Playbook Executed' : '▶ Execute Playbook'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
