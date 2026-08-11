import useStore from '../store/useStore'

export default function ModelRegistry() {
  const models = useStore(s => s.models)
  const agents = useStore(s => s.agents)

  const phiModels = models.filter(m => m.phi).length
  const validatedModels = models.filter(m => m.validated).length
  const unvalidatedModels = models.length - validatedModels

  return (
    <div className="view-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
        margin: '24px 24px 0 24px'
      }}>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #8b5cf6', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>REGISTERED MODELS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{models.length}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #ef4444', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>UNVALIDATED</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{unvalidatedModels}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>PHI MODELS</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{phiModels}</div>
        </div>
        <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid #10b981', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>VALIDATED</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{validatedModels}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ margin: '16px 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>AI Model Registry</div>
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '4px 12px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>Healthcare</div>
        </div>
        
        <div className="tbl-wrap" style={{ flex: 1, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Model</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Vendor</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Type</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Task</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Used By</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>PHI</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Validated</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Last Audit</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                    No models registered yet
                  </td>
                </tr>
              ) : models.map(m => {
                const linkedAgents = agents.filter(a => (m.agents || []).includes(a.id)).length
                
                return (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</div>
                      {m.validated && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 600, background: '#e0e7ff', color: '#4f46e5', padding: '2px 6px', borderRadius: 4 }}>SOC2</span>
                          <span style={{ fontSize: 9, fontWeight: 600, background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: 4 }}>BAA available</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ color: m.vendor === 'Microsoft' ? '#3b82f6' : '#9ca3af', fontWeight: m.vendor === 'Microsoft' ? 600 : 500, fontSize: 12 }}>
                        {m.vendor}
                      </span>
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{m.type || 'LLM'}</td>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{m.task || 'Text generation'}</td>
                    <td>
                      <span style={{ color: '#4f46e5', fontWeight: 700, fontSize: 13 }}>{m.agents?.length || 0}</span>
                    </td>
                    <td>
                      {m.phi && (
                        <span style={{ background: '#fef2f2', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                          PHI risk
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: m.validated ? '#16a34a' : '#ef4444', fontWeight: 600, fontSize: 11 }}>
                        {m.validated ? 'SOC 2 certified' : 'Not certified'}
                      </span>
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{m.last_audit ? m.last_audit.split('T')[0] : '--'}</td>
                    <td>
                      <span style={{ 
                        background: m.risk === 'high' || m.risk === 'critical' ? '#fef3c7' : '#e0e7ff', 
                        color: m.risk === 'high' || m.risk === 'critical' ? '#d97706' : '#4f46e5', 
                        padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' 
                      }}>
                        {m.risk || 'MEDIUM'}
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
