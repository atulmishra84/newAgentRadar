import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';

const PERSONAS = [
  ['analyst@acme.health', 'Analyst123!', 'Analyst'],
  ['ciso@acme.health', 'Ciso123!', 'CISO'],
  ['admin@acme.health', 'Admin123!', 'Admin'],
];

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('analyst@acme.health');
  const [password, setPassword] = useState('Analyst123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [entra, setEntra] = useState(null);
  const [mfaNote, setMfaNote] = useState('');

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMfaNote('');
    try {
      const result = await login(email, password);
      if (result?.mfa?.required && !result?.mfa?.enabled) {
        setMfaNote('MFA is required for this role in production (set MFA_ENFORCE=true).');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function checkEntra() {
    const s = await api('/api/auth/entra/status');
    setEntra(s);
    if (s.configured) {
      const { url } = await api('/api/auth/entra/login');
      window.location.href = url;
    }
  }

  return (
    <>
      <div className="mesh" />
      <div className="login-page">
        <div className="glass login-card">
          <h1>AgentRadar</h1>
          <div className="positioning">Your CMDB for AI agents</div>
          <p className="sub">Know every agent, model, edge, and runtime in motion.</p>
          <form onSubmit={onSubmit}>
            <div className="form-row">
              <label>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div className="form-row">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="error">{error}</p>}
            {mfaNote && <p className="muted" style={{ fontSize: 12 }}>{mfaNote}</p>}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={checkEntra}>
            Sign in with Microsoft Entra
          </button>
          {entra && !entra.configured && (
            <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              Entra SSO not configured. Set ENTRA_* env vars.
            </p>
          )}
          <div className="pill-row" style={{ marginTop: 16 }}>
            {PERSONAS.map(([e, p, label]) => (
              <button
                key={label}
                type="button"
                className="pill"
                style={{ cursor: 'pointer' }}
                onClick={() => { setEmail(e); setPassword(p); }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Demo: analyst@acme.health / Analyst123!
          </p>
        </div>
      </div>
    </>
  );
}
