import useStore from '../store/useStore'

const STAGE_LABELS = { pending: '⏳ Pending', review: '🔍 In Review', approved: '✅ Approved', rejected: '❌ Rejected' }
const STAGE_COLORS = { pending: 'var(--amber)', review: 'var(--brand)', approved: 'var(--green)', rejected: 'var(--red)' }
const STAGE_BG     = { pending: 'var(--amber-bg)', review: 'var(--brand-bg)', approved: 'var(--green-bg)', rejected: 'var(--red-bg)' }
const STAGE_BORDER = { pending: 'var(--amber-border)', review: 'var(--brand-border)', approved: 'var(--green-border)', rejected: 'var(--red-border)' }

export default function Approvals() {
  const approvals   = useStore(s => s.approvals)
  const agents      = useStore(s => s.agents)
  const approveAgent = useStore(s => s.approveAgent)
  const rejectAgent  = useStore(s => s.rejectAgent)
  const openDrawer  = useStore(s => s.openDrawer)

  // Dynamically build history from resolved approvals
  const apprHist = approvals
    .filter(a => a.stage === 'approved' || a.stage === 'rejected')
    .sort((a, b) => new Date(b.resolved_at || 0) - new Date(a.resolved_at || 0))
    .slice(0, 10)
    .map(a => {
      const ag = agents.find(ag => ag.id === a.aid) || { name: 'Unknown Agent' }
      return {
        t: `${ag.name} ${a.stage}`,
        m: `${a.resolved_by || 'System'} · ${a.resolved_at ? a.resolved_at.split('T')[0] : 'Just now'}`,
        c: a.stage === 'approved' ? '#10b981' : '#ef4444'
      }
    })

  const pending  = approvals.filter(a => a.stage === 'pending')
  const review   = approvals.filter(a => a.stage === 'review')
  const approved = approvals.filter(a => a.stage === 'approved')
  const rejected = approvals.filter(a => a.stage === 'rejected')

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Pending', value: pending.length,  color: 'var(--amber)', bg: 'var(--amber-bg)' },
          { label: 'In Review', value: review.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'Approved',  value: approved.length, color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: 'Rejected',  value: rejected.length, color: 'var(--red)', bg: 'var(--red-bg)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, flex: 1 }}>
        {/* Queue */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', fontWeight: 700, fontSize: 13 }}>Approval Queue</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {approvals.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No approval requests pending</div>
            ) : approvals.map(ap => {
              const agent = agents.find(a => a.id === ap.aid) || { name: `Agent #${ap.aid}`, risk: 'medium', env: '—' }
              const canAct = ap.stage === 'pending' || ap.stage === 'review'
              return (
                <div key={ap.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(200,210,240,0.2)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                            background: STAGE_BG[ap.stage], color: STAGE_COLORS[ap.stage],
                            border: `1px solid ${STAGE_BORDER[ap.stage]}`,
                          }}
                        >{STAGE_LABELS[ap.stage]}</span>
                        <span className={`rtag rt-${agent.risk}`}>{agent.risk}</span>
                      </div>
                      <div
                        style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: 2 }}
                        onClick={() => openDrawer(ap.aid)}
                      >{agent.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{ap.note}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Submitted by {ap.by} · {ap.at ? ap.at.split('T')[0] : '--'}
                      </div>
                    </div>
                    {canAct && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn sm success" onClick={() => approveAgent(ap.id)}>Approve</button>
                        <button className="btn sm danger" onClick={() => rejectAgent(ap.id)}>Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* History sidebar */}
        <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>Recent Decisions</div>
            {apprHist.map((h, i) => (
              <div key={i} className="act-row">
                <div className="act-icon" style={{ background: h.c + '18', fontSize: 14 }}>
                  {h.c === '#10b981' ? '✅' : '❌'}
                </div>
                <div className="act-body">
                  <div className="act-title" style={{ fontSize: 11 }}>{h.t}</div>
                  <div className="act-meta">{h.m}</div>
                </div>
              </div>
            ))}
            {apprHist.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No decisions yet</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
