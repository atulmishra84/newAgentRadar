import { useEffect, useState } from 'react'
import useStore from '../store/useStore'
import { activityAPI } from '../lib/api'

const CAT_COLORS = {
  scan: 'var(--brand)',
  alert: 'var(--red)',
  info: 'var(--blue)',
  reg: 'var(--green)',
  default: 'var(--text-muted)'
}

const CAT_ICONS = {
  scan: '🔍',
  alert: '🚨',
  info: 'ℹ️',
  reg: '⚡',
  default: '📝'
}

export default function ActivityLog() {
  const [loading, setLoading] = useState(true)
  const activity = useStore(s => s.activity)
  const setActivity = useStore(s => s.setActivity) // we'll need to add this or just use fetchActivity
  const fetchActivity = useStore(s => s.fetchActivity)

  useEffect(() => {
    fetchActivity().finally(() => setLoading(false))
  }, [fetchActivity])

  return (
    <div className="view-enter" style={{ padding: '32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Platform Activity Log</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 14 }}>Real-time audit trail of all system events, scans, and user actions.</p>
          </div>
          <button 
            className="btn outline" 
            onClick={() => { setLoading(true); fetchActivity().finally(() => setLoading(false)) }}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? "spin" : ""}>
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading && activity.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading activity...
            </div>
          ) : activity.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              No activity recorded
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.map((a, i) => {
                const cat = (a.category || a.type || 'default').toLowerCase()
                const msg = a.description || a.msg || a.t || 'Unknown activity'
                const who = a.created_by || a.m?.split('·')[0]?.trim() || 'System'
                const when = a.created_at
                  ? new Date(a.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                  : a.m?.split('·')[1]?.trim() || 'just now'
                
                const color = CAT_COLORS[cat] || CAT_COLORS.default
                const icon = CAT_ICONS[cat] || CAT_ICONS.default
                
                return (
                  <div key={i} style={{ 
                    display: 'flex', 
                    padding: '20px 24px',
                    borderBottom: i === activity.length - 1 ? 'none' : '1px solid rgba(200,210,240,0.2)',
                    transition: 'background 0.2s',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ 
                      width: 40, height: 40, borderRadius: 12, 
                      background: `${color}15`, border: `1px solid ${color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, marginRight: 20, flexShrink: 0
                    }}>
                      {icon}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, marginBottom: 4, lineHeight: 1.4 }}>
                        {msg}
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          {who}
                        </span>
                        <span style={{ color: 'var(--glass-border-dim)' }}>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          {when}
                        </span>
                        <span style={{ color: 'var(--glass-border-dim)' }}>•</span>
                        <span style={{ 
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', 
                          borderRadius: 99, background: `${color}20`, color: color,
                          textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                          {cat}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
