import { useState, useMemo } from 'react'
import useStore from '../store/useStore'
import { computeViolations } from '../lib/helpers'

export default function Discovery() {
  const agents = useStore(s => s.agents)
  const policies = useStore(s => s.policies)
  const openDrawer = useStore(s => s.openDrawer)
  const openModal = useStore(s => s.openModal)

  const [typeFilter, setTypeFilter] = useState('all')
  const [envFilter, setEnvFilter] = useState('all')
  const [query, setQuery] = useState('')

  const violations = useMemo(() => computeViolations(agents, policies), [agents, policies])

  const filtered = useMemo(() => {
    let list = agents
    if (typeFilter === 'shadow') list = list.filter(a => a.shadow)
    else if (typeFilter === 'agent') list = list.filter(a => a.type === 'agent')
    else if (typeFilter === 'bot') list = list.filter(a => a.type === 'bot')
    if (envFilter !== 'all') list = list.filter(a => a.env === envFilter)
    if (query) list = list.filter(a =>
      a.name?.toLowerCase().includes(query) ||
      a.protocols?.join(' ').toLowerCase().includes(query) ||
      a.dataAccess?.toLowerCase().includes(query) ||
      a.env?.toLowerCase().includes(query)
    )
    return list
  }, [agents, typeFilter, envFilter, query])

  const stats = [
    { title: 'TOTAL AGENTS', value: agents.length, sub: 'All environments', color: 'var(--brand)' },
    { title: 'SHADOW AI', value: agents.filter(a => a.shadow).length, sub: 'Unauthorized', color: 'var(--red)' },
    { title: 'CRITICAL RISK', value: agents.filter(a => a.risk === 'critical').length, sub: 'Need action', color: 'var(--red)' },
    { title: 'COMPLIANT', value: agents.filter(a => a.controls && Object.values(a.controls).length > 0 && Object.values(a.controls).every(c => c === 'pass')).length, sub: 'All controls pass', color: 'var(--green)' },
    { title: 'POLICY VIOLATIONS', value: violations.length, sub: 'Active', color: 'var(--amber)' }
  ]

  return (
    <div className="view-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Banner */}
      <div style={{
        margin: '24px 24px 0 24px',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 8,
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--text-muted)'
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
        Background scanner active · Next: 15 min
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16,
        margin: '16px 24px 0 24px'
      }}>
        {stats.map((s, i) => (
          <div key={i} className="card" style={{ padding: '20px 24px', borderTop: `3px solid ${s.color}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{s.title}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ margin: '16px 24px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Filter bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="search-inp"
            style={{
              flex: 1, minWidth: 200,
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(200,210,240,0.6)',
              borderRadius: 'var(--r10)',
              padding: '7px 14px',
              fontFamily: 'var(--font-body)', fontSize: 12,
              outline: 'none',
            }}
            placeholder="Search agents, protocols, data access…"
            value={query}
            onChange={e => setQuery(e.target.value.toLowerCase())}
          />
          <div id="type-btns" style={{ display: 'flex', gap: 6 }}>
            {['all','agent','bot','shadow'].map(t => (
              <button key={t} className={`filter-pill${typeFilter===t?' on':''}`} onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All types' : t === 'agent' ? 'AI Agent' : t === 'bot' ? 'Bot' : 'Shadow AI'}
              </button>
            ))}
          </div>
          {['all','Cloud','On-Prem','Hybrid'].map(e => (
            <button key={e} className={`filter-pill${envFilter===e?' on':''}`} onClick={() => setEnvFilter(e)}>
              {e === 'all' ? 'All envs' : e}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="tbl-wrap" style={{ flex: 1, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Agent</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Category</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Type</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Environment</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Data Scope</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Owner</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Last Seen</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Score</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Risk</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Lifecycle</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Duplicate</th>
                <th style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>Status</th>
              </tr>
            </thead>
            <tbody id="disc-tbody">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                    {agents.length === 0 ? 'No agents registered — run a scan to discover agents' : 'No agents match the current filters'}
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const formatDate = (ds) => {
                    if (!ds) return '22/06/2026,\n17:23:11'
                    const d = new Date(ds)
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()},\n${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
                  }
                  
                  return (
                    <tr key={a.id} onClick={() => openDrawer(a.id)}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.name}</span>
                      </td>
                      <td>
                        {a.agent_category ? (
                          <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
                            {a.agent_category}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {a.type || <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                      <td>
                        {a.env ? (
                          <span style={{ background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
                            {a.env}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {a.data_access || <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {a.owner || <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'pre-line' }}>
                        {formatDate(a.last_seen || a.lastSeen)}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {a.risk_score != null ? (
                          <><strong style={{ color: a.risk_score >= 80 ? '#ef4444' : a.risk_score >= 50 ? '#f97316' : '#16a34a' }}>{a.risk_score}</strong><span style={{ color: 'var(--text-muted)' }}>/100</span></>
                        ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                      <td>
                        {a.risk ? (
                          <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                            {a.risk}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                      <td>
                        <span style={{ color: a.quarantined ? '#ef4444' : '#16a34a', fontWeight: 600, fontSize: 11 }}>
                          {a.quarantined ? 'Quarantined' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {a.duplicate_score > 0 ? (
                          <span style={{ border: '1px solid #f97316', color: '#f97316', padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            ⚡ {a.duplicate_score}% match
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>
                        )}
                      </td>
                      <td>
                        {a.lifecycle_status ? (
                          <span style={{ color: a.lifecycle_status === 'approved' ? '#16a34a' : '#d97706', fontWeight: 600, fontSize: 11, textTransform: 'capitalize' }}>
                            {a.lifecycle_status}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>&#8212;</span>}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
