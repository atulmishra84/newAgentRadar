import { useLocation, useNavigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import { VM, exportCSV } from '../../lib/helpers'

// Map path → view id
function pathToView(pathname) {
  const map = {
    '/dashboard':              'dashboard',
    '/discovery':              'discovery',
    '/discovery/all':          'discovery',
    '/discovery/live':         'live',
    '/discovery/shadow':       'shadow',
    '/discovery/phi':          'phi',
    '/discovery/models':       'models',
    '/governance/policy':      'policy',
    '/governance/approvals':   'approvals',
    '/governance/compliance':  'compliance',
    '/governance/playbooks':   'playbooks',
    '/intelligence/risk':      'risk',
    '/intelligence/mesh':      'blast',
    '/intelligence/lineage':   'lineage',
    '/integrations/connect':   'integrations',
    '/reports/ciso':           'ciso',
    '/reports/benchmark':      'benchmark',
    '/notifications':          'notifications',
    '/ops/activity':           'activity',
    '/admin':                  'admin',
  }
  return map[pathname] || 'dashboard'
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const openModal = useStore(s => s.openModal)
  const openAIPanel = useStore(s => s.openAIPanel)
  const stats = useStore(s => s.getStats())
  const user = useStore(s => s.user)
  const agents = useStore(s => s.agents)

  const view = pathToView(location.pathname)
  const meta = VM[view] || { title: 'Dashboard', bc: '/dashboard' }

  const showExport = ['dashboard', 'discovery'].includes(view)
  const showAdd = ['dashboard', 'discovery', 'shadow', 'approvals'].includes(view)

  const initials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'AR'

  return (
    <header
      id="topbar"
      style={{
        height: 58, flexShrink: 0,
        background: 'var(--glass-white)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid var(--glass-border-dim)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
        position: 'relative', zIndex: 10,
      }}
    >
      {/* Title + breadcrumb */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div id="tb-title" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.3 }}>
          {meta.title}
        </div>
        <div id="tb-bc" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta.bc}</div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'var(--glass-border-dim)' }} />

      {/* Action Buttons */}
      {showExport && (
        <button id="btn-export" className="btn" onClick={() => exportCSV(agents)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          ↓ Export
        </button>
      )}

      {showAdd && (
        <>
          <button className="btn sm" onClick={() => openModal('import')}>↑ Import</button>
          <button className="btn sm" onClick={() => openModal('add-agent')}>+ Register</button>
          <button className="btn primary sm" onClick={() => openModal('scan')} style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', padding: '6px 14px', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600 }}>
            ⚡ Auto-Discover
          </button>
          <button className="btn sm" onClick={() => openModal('webhooks')} title="Webhooks">🔔</button>
          <button className="btn ai sm" onClick={openAIPanel}>✦ AI Agent</button>
        </>
      )}

      {/* Global Search */}
      <div className="tb-divider" style={{ width: 1, height: 20, background: 'var(--glass-border-dim)', marginLeft: 8 }} />
      <div
        style={{
          display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)',
          border: '1px solid var(--glass-border-dim)', borderRadius: 8, padding: '4px 12px',
          width: 200, transition: 'all 0.2s'
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--text-muted)', marginRight: 8 }}>⌕</span>
        <input
          type="text"
          placeholder="Search agents…"
          style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: '100%', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Topbar actions */}
      <button className="btn sm" title="Toggle dark mode (D)" onClick={() => document.documentElement.classList.toggle('dark')}>🌙</button>
      <button className="btn sm" title="Refresh live data from API" onClick={() => window.location.reload()} style={{ fontSize: 14 }}>↻</button>
      <button className="btn sm" title="Help" onClick={() => openModal('shortcuts')} style={{ fontSize: 14 }}>?</button>
      <button className="btn sm" onClick={() => openModal('shortcuts')} title="Keyboard shortcuts (?)">⌨</button>
      <button className="btn sm" onClick={() => openModal('evidence')} title="Export evidence package (⌘E)">📋</button>

      {/* User area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {user?.name || user?.email?.split('@')[0] || 'admin'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {user?.role || 'CISO'}
          </div>
        </div>

        {/* Notification bell */}
        <button
          className="notif-btn"
          onClick={() => navigate('/notifications')}
          style={{
            width: 34, height: 34, borderRadius: 'var(--r8)',
            background: 'var(--glass-white)', border: '1px solid var(--glass-border-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-primary)" strokeWidth="1.8">
            <path d="M8 1a5 5 0 0 1 5 5v3l1.5 2H1.5L3 9V6a5 5 0 0 1 5-5z"/>
            <path d="M6.5 13a1.5 1.5 0 0 0 3 0" strokeLinecap="round"/>
          </svg>
          <span
            style={{
              position: 'absolute', top: -1, right: 0,
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--red)',
              border: '1px solid white',
            }}
          />
        </button>
      </div>
    </header>
  )
}
