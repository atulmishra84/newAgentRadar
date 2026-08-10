import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, ensureCsrf } from '../api';

const PERSONAS = [
  ['analyst@acme.health', 'Analyst123!', 'Analyst'],
  ['ciso@acme.health', 'Ciso123!', 'CISO'],
  ['admin@acme.health', 'Admin123!', 'Admin'],
];

export default function Login() {
  const { user, login, completeMfaLogin } = useAuth();
  const [email, setEmail] = useState('analyst@acme.health');
  const [password, setPassword] = useState('Analyst123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [entra, setEntra] = useState(null);
  const [challengeToken, setChallengeToken] = useState('');
  const [enrollToken, setEnrollToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [step, setStep] = useState('login'); // login | mfa | enroll

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result?.mfaChallenge) {
        setChallengeToken(result.challengeToken);
        setStep('mfa');
      } else if (result?.mfaEnrollRequired) {
        setEnrollToken(result.enrollToken);
        await startEnroll(result.enrollToken);
        setStep('enroll');
      }
    } catch (err) {
      if (err.data?.mfaEnrollRequired) {
        setEnrollToken(err.data.enrollToken);
        try {
          await startEnroll(err.data.enrollToken);
          setStep('enroll');
        } catch (e2) {
          setError(e2.message);
        }
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setBusy(false);
    }
  }

  async function startEnroll(token) {
    await ensureCsrf();
    const d = await api('/api/auth/mfa/enroll/start', {
      method: 'POST',
      body: { enrollToken: token },
    });
    setQr(d.qrDataUrl);
    setSecret(d.secret);
  }

  async function verifyMfa(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await completeMfaLogin(challengeToken, mfaCode);
    } catch (err) {
      setError(err.message || 'Invalid MFA code');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await api('/api/auth/mfa/enroll/confirm', {
        method: 'POST',
        body: { code: mfaCode, enrollToken },
      });
      if (d.token) {
        localStorage.setItem('ar_token', d.token);
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.message || 'Enrollment failed');
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

          {step === 'login' && (
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
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          {step === 'mfa' && (
            <form onSubmit={verifyMfa}>
              <p className="muted">Enter the 6-digit code from your authenticator app.</p>
              <div className="form-row">
                <label>MFA code</label>
                <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} autoFocus inputMode="numeric" />
              </div>
              {error && <p className="error">{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>Verify</button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setStep('login')}>
                Back
              </button>
            </form>
          )}

          {step === 'enroll' && (
            <form onSubmit={confirmEnroll}>
              <p className="muted">MFA is required for this role. Scan the QR code, then confirm with a code.</p>
              {qr && <img src={qr} alt="MFA QR" style={{ width: 180, height: 180, display: 'block', margin: '12px auto' }} />}
              {secret && <p className="mono muted" style={{ textAlign: 'center' }}>{secret}</p>}
              <div className="form-row">
                <label>Confirm code</label>
                <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputMode="numeric" />
              </div>
              {error && <p className="error">{error}</p>}
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>Enable MFA & continue</button>
            </form>
          )}

          {step === 'login' && (
            <>
              <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={checkEntra}>
                Sign in with Microsoft Entra
              </button>
              <button
                className="btn"
                style={{ width: '100%', marginTop: 8 }}
                onClick={async () => {
                  try {
                    const d = await api('/api/auth/saml/login');
                    window.location.href = d.url;
                  } catch (err) {
                    setError(err.message || 'SAML not configured');
                  }
                }}
              >
                Sign in with SAML IdP
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
