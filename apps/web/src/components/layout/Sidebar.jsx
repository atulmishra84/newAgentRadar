import { useNavigate, useLocation } from 'react-router-dom'
import useStore from '../../store/useStore'

// Nav items config matching original VM map
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: DashIcon, badge: null },
    ]
  },
  {
    label: 'Discovery',
    items: [
      { id: 'discovery',  path: '/discovery',          label: 'Agent Discovery',     icon: DiscIcon,   badgeKey: 'total',  badgeCls: 'nb-gray' },
      { id: 'live',       path: '/discovery/live',     label: 'Live Detection',      icon: LiveIcon,   badge: null },
      { id: 'shadow',     path: '/discovery/shadow',   label: 'Shadow AI',           icon: ShadowIcon, badgeKey: 'shadow', badgeCls: 'nb-red' },
      { id: 'phi',        path: '/discovery/phi',      label: 'PHI Exposure',        icon: PhiIcon,    badgeKey: 'phi',    badgeCls: 'nb-amber' },
      { id: 'models',     path: '/discovery/models',   label: 'Model Registry',      icon: ModelIcon,  badgeKey: 'models', badgeCls: 'nb-brand' },
    ]
  },
  {
    label: 'Governance',
    items: [
      { id: 'policy',     path: '/governance/policy',      label: 'Policy Engine',      icon: PolicyIcon,    badgeKey: 'violations', badgeCls: 'nb-amber' },
      { id: 'approvals',  path: '/governance/approvals',   label: 'Approvals',          icon: ApprovIcon,    badgeKey: 'pending',    badgeCls: 'nb-red' },
      { id: 'compliance', path: '/governance/compliance',  label: 'Compliance Posture', icon: CompIcon,      badge: null },
      { id: 'playbooks',  path: '/governance/playbooks',   label: 'Remediation',        icon: PlaybookIcon,  badge: null },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'risk',    path: '/intelligence/risk',    label: 'Risk & Analytics', icon: RiskIcon,    badgeKey: 'critical', badgeCls: 'nb-red' },
      { id: 'blast',   path: '/intelligence/mesh',    label: 'Global Mesh',      icon: MeshIcon,    badge: null },
      { id: 'lineage', path: '/intelligence/lineage', label: 'Data Lineage Map', icon: LineageIcon, badge: null },
    ]
  },
  {
    label: 'Integrations',
    items: [
      { id: 'integrations', path: '/integrations/connect', label: 'Connect Hub', icon: IntegIcon, badge: null },
    ]
  },
  {
    label: 'Reports',
    items: [
      { id: 'ciso',      path: '/reports/ciso',      label: 'CISO Report',       icon: CisoIcon,      badge: null },
      { id: 'benchmark', path: '/reports/benchmark', label: 'Peer Benchmarking', icon: BenchmarkIcon, badge: null },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'notifications', path: '/notifications',  label: 'Notifications', icon: NotifIcon, badgeKey: 'unreadNotifs', badgeCls: 'nb-red' },
      { id: 'activity',      path: '/ops/activity',   label: 'Activity Log',  icon: ActIcon,   badge: null },
    ]
  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const stats = useStore(s => s.getStats())
  const models = useStore(s => s.models)
  const tenants = useStore(s => s.tenants)
  const lastScan = useStore(s => s.lastScan)

  const badgeValues = {
    total: stats.total,
    shadow: stats.shadow,
    phi: stats.phi,
    models: models.length,
    critical: stats.critical,
    violations: stats.violations,
    pending: stats.pendingApprovals,
    unreadNotifs: stats.unreadNotifs,
  }

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      id="sidebar"
      style={{
        width: 'var(--sidebar-w)',
        minWidth: 'var(--sidebar-w)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--glass-white)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRight: '1px solid var(--glass-border)',
        boxShadow: '2px 0 24px rgba(100,120,200,0.08)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div className="sb-logo" style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--glass-border-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)',
              borderRadius: 'var(--r10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.2" fill="white"/>
              <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1" strokeDasharray="2 1.5"/>
              <circle cx="2" cy="7" r="1" fill="white" opacity=".6"/>
              <circle cx="12" cy="7" r="1" fill="white" opacity=".6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4 }}>
              AgentRadar
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>AI Governance Platform</div>
          </div>
        </div>

        {/* Tenant pill */}
        {tenants[0] && (
          <div
            style={{
              marginTop: 10,
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--brand-bg)',
              border: '1px solid var(--brand-border)',
              borderRadius: 'var(--r24)',
              padding: '5px 12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', flex: 1 }}>
              {tenants[0].n}
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" opacity=".5">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '10px 8px 4px',
            }}>
              {section.label}
            </div>
            {section.items.map(item => {
              const active = isActive(item.path)
              const badgeVal = item.badgeKey ? badgeValues[item.badgeKey] : null
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 10px',
                    borderRadius: 'var(--r10)',
                    cursor: 'pointer',
                    color: active ? 'var(--brand)' : 'var(--text-secondary)',
                    fontSize: 12.5, fontWeight: active ? 600 : 500,
                    transition: 'all 0.15s',
                    width: '100%', border: 'none', textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    background: active
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)'
                      : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px var(--brand-border)' : 'none',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.color = 'var(--brand)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                >
                  <item.icon
                    style={{
                      width: 15, height: 15,
                      opacity: active ? 1 : 0.6,
                      flexShrink: 0,
                      color: active ? 'var(--brand)' : 'currentColor',
                    }}
                  />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badgeVal != null && badgeVal > 0 && (
                    <span
                      className={`nav-badge ${item.badgeCls}`}
                      style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center' }}
                    >
                      {badgeVal}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        {/* Admin */}
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px',
              borderRadius: 'var(--r10)',
              cursor: 'pointer',
              color: location.pathname === '/admin' ? 'var(--brand)' : 'var(--text-secondary)',
              fontSize: 12.5, fontWeight: location.pathname === '/admin' ? 600 : 500,
              transition: 'all 0.15s',
              width: '100%', border: 'none', textAlign: 'left',
              fontFamily: 'var(--font-body)',
              background: location.pathname === '/admin'
                ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)'
                : 'transparent',
            }}
          >
            <AdminIcon style={{ width: 15, height: 15, opacity: 0.6, flexShrink: 0 }} />
            <span>Administration</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--glass-border-dim)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
          <div className="live-pulse-dot" />
          <span>Live scanning active</span>
        </div>
        <div id="scan-time" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {lastScan ? `Last scan: ${new Date(lastScan).toLocaleTimeString()}` : 'No scan yet'}
        </div>
      </div>
    </aside>
  )
}

/* ── SVG Icon Components ───────────────────────── */
function DashIcon(p)     { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg> }
function DiscIcon(p)     { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="7" cy="7" r="4"/><path d="M11 11l3 3" strokeLinecap="round"/></svg> }
function LiveIcon(p)     { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="2.5"/><path d="M3.5 8a4.5 4.5 0 1 0 9 0 4.5 4.5 0 0 0-9 0" strokeDasharray="2 1.5"/></svg> }
function ShadowIcon(p)   { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2a6 6 0 0 1 0 12M8 2a6 6 0 0 0 0 12M8 2v12" strokeLinecap="round"/><path d="M2 8h12" strokeLinecap="round"/></svg> }
function PhiIcon(p)      { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2v12M5 5h6a3 3 0 0 1 0 6H5" strokeLinecap="round"/></svg> }
function ModelIcon(p)    { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><path d="M11.5 9v5M9 11.5h5" strokeLinecap="round"/></svg> }
function PolicyIcon(p)   { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="2" width="10" height="13" rx="1.5"/><path d="M6 6h4M6 9h4M6 12h2" strokeLinecap="round"/></svg> }
function ApprovIcon(p)   { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CompIcon(p)     { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1L2 5.3l4.2-.7z"/></svg> }
function PlaybookIcon(p) { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function RiskIcon(p)     { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2l6 12H2L8 2z"/><path d="M8 7v3M8 11.5v.5" strokeLinecap="round"/></svg> }
function MeshIcon(p)     { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="4" r="1.5"/><circle cx="14" cy="4" r="1.5"/><circle cx="2" cy="12" r="1.5"/><circle cx="14" cy="12" r="1.5"/><path d="M3.5 4.5L6.5 7M9.5 7l3-2.5M3.5 11.5L6.5 9M9.5 9l3 2.5"/></svg> }
function LineageIcon(p)  { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="6" width="4" height="4" rx="1"/><rect x="11" y="2" width="4" height="4" rx="1"/><rect x="11" y="10" width="4" height="4" rx="1"/><path d="M5 8h3l3-4M5 8h3l3 4" strokeLinecap="round"/></svg> }
function IntegIcon(p)    { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 8h4M4 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg> }
function CisoIcon(p)     { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1l5 3v5c0 3.5-5 6-5 6S3 12.5 3 9V4L8 1z"/></svg> }
function BenchmarkIcon(p){ return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12l3-4 3 2 3-5 3 3" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function NotifIcon(p)    { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1a5 5 0 0 1 5 5v3l1.5 2H1.5L3 9V6a5 5 0 0 1 5-5z"/><path d="M6.5 13a1.5 1.5 0 0 0 3 0" strokeLinecap="round"/></svg> }
function ActIcon(p)      { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2v4l3 3" strokeLinecap="round"/><circle cx="8" cy="8" r="6"/></svg> }
function AdminIcon(p)    { return <svg {...p} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round"/></svg> }
