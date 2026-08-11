import { useState } from 'react'
import useStore from '../../store/useStore'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../../lib/api'

const ROLES = [
  { id: 'ciso',    name: 'CISO',              desc: 'Full access — all views, actions, exports', badge: 'Full admin',  cls: 'rb-ciso' },
  { id: 'analyst', name: 'Security Analyst',  desc: 'All views, no approve/quarantine',          badge: 'Analyst',     cls: 'rb-analyst' },
  { id: 'auditor', name: 'Auditor',           desc: 'Read-only + export only',                   badge: 'Auditor',     cls: 'rb-auditor' },
  { id: 'viewer',  name: 'Viewer',            desc: 'Dashboard view only',                       badge: 'Read-only',   cls: 'rb-viewer' },
]

export default function LoginScreen() {
  const login = useStore(s => s.login)
  const openOnboarding = useStore(s => s.openOnboarding)
  const navigate = useNavigate()

  const [email, setEmail] = useState('admin@agentradar.local')
  const [password, setPassword] = useState('AgentRadar@Prod2026!')
  const [role, setRole] = useState('ciso')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function doLogin() {
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login(email, password, role)
      const userData = res.data?.user || { email, role, name: email.split('@')[0] }
      login(userData)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Login failed. Please check credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="login-screen">
      <div className="login-box">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}>
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.2" fill="white"/>
              <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1" strokeDasharray="2 1.5"/>
              <circle cx="2" cy="7" r="1" fill="white" opacity=".6"/>
              <circle cx="12" cy="7" r="1" fill="white" opacity=".6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>
              AgentRadar
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          AI Governance Platform — sign in to continue
        </div>

        {/* Email */}
        <div className="login-field" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Email</div>
          <input
            className="login-inp"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        {/* Password */}
        <div className="login-field" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Password</div>
          <input
            className="login-inp"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
            placeholder="Password"
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8 }}>{error}</div>
        )}

        {/* Role selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Select your role</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ROLES.map(r => (
              <div
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${role === r.id ? 'var(--brand-border)' : 'var(--glass-border-dim)'}`,
                  background: role === r.id ? 'var(--brand-bg)' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{r.desc}</div>
                <span style={{
                  display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 99,
                  background: role === r.id ? 'var(--brand)' : 'rgba(200,210,240,0.3)',
                  color: role === r.id ? 'white' : 'var(--text-muted)',
                }}>
                  {r.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign in button */}
        <button
          className="btn primary"
          style={{ width: '100%', padding: 10, marginBottom: 14 }}
          onClick={doLogin}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in to AgentRadar'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--glass-border-dim)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--glass-border-dim)' }} />
        </div>

        {/* SSO buttons */}
        <button
          onClick={() => { window.location.href = '/api/auth/sso/azure' }}
          style={{
            width: '100%', padding: 10, borderRadius: 10,
            border: '1px solid var(--glass-border-dim)',
            background: 'var(--glass-white)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 23 23" fill="none">
            <path d="M1 1h10v10H1z" fill="#f25022"/>
            <path d="M12 1h10v10H12z" fill="#7fba00"/>
            <path d="M1 12h10v10H1z" fill="#00a4ef"/>
            <path d="M12 12h10v10H12z" fill="#ffb900"/>
          </svg>
          Continue with Microsoft Entra
        </button>

        <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
          SSO / SAML available for enterprise accounts
        </div>
      </div>
    </div>
  )
}
