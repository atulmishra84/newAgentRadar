import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV = [
  {
    label: 'Overview',
    items: [
      ['/', 'Dashboard'],
      ['/operations', 'Operations'],
      ['/coverage', 'Coverage Map'],
    ],
  },
  {
    label: 'Discovery',
    items: [
      ['/discovery', 'Agent Discovery'],
      ['/shadow', 'Shadow AI'],
      ['/phi', 'PHI Exposure'],
      ['/models', 'Model Registry'],
    ],
  },
  {
    label: 'Governance',
    items: [
      ['/policy', 'Policy Engine'],
      ['/compliance', 'Compliance'],
      ['/playbooks', 'Playbooks'],
      ['/enforcement', 'Enforcement'],
    ],
  },
  {
    label: 'Intelligence',
    items: [
      ['/risk', 'Risk Analytics'],
      ['/risk-settings', 'Risk Weights'],
      ['/ciso', 'CISO Report'],
    ],
  },
  {
    label: 'Platform',
    items: [
      ['/integrations', 'Integrations'],
      ['/sso', 'SSO & IAM'],
      ['/tenants', 'Tenants'],
      ['/admin', 'Admin'],
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <div className="mesh" />
      <div className="app-shell">
        <aside className="sidebar">
          <h1 className="brand">Agent<span>Radar</span></h1>
          <p className="tagline">Know every agent, model, edge, and runtime in motion.</p>
          <div className="positioning">Your CMDB for AI agents</div>
          <nav className="nav">
            {NAV.map((g) => (
              <div className="nav-group" key={g.label}>
                <div className="nav-label">{g.label}</div>
                {g.items.map(([to, label]) => (
                  <NavLink key={to} to={to} end={to === '/'}>
                    {label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem' }} className="muted">
            <div>{user?.name}</div>
            <div>{user?.role}{user?.tenantSlug ? ` · ${user.tenantSlug}` : ''}</div>
            {user?.mfa_enabled === false && ['platform_admin', 'ciso'].includes(user?.role) && (
              <div style={{ color: 'var(--warn)', marginTop: 4 }}>MFA recommended</div>
            )}
            <button className="btn btn-ghost" style={{ marginTop: '0.5rem' }} onClick={logout}>
              Sign out
            </button>
          </div>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
