import { useEffect, useState } from 'react';
import { api } from '../api';

const ROLES = ['platform_admin', 'ciso', 'analyst', 'auditor', 'viewer'];

export default function Sso() {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState({});
  const [mapping, setMapping] = useState({ claim_name: 'roles', claim_value: '', role: 'analyst' });
  const [msg, setMsg] = useState('');

  async function load() {
    const d = await api('/api/settings/sso');
    setData(d);
    setConfig(d.config || {});
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function saveConfig() {
    await api('/api/settings/sso', { method: 'PUT', body: config });
    setMsg('SSO config saved');
    await load();
  }

  async function addMapping() {
    await api('/api/settings/sso/mappings', { method: 'POST', body: mapping });
    setMapping({ claim_name: 'roles', claim_value: '', role: 'analyst' });
    setMsg('Role mapping added');
    await load();
  }

  async function removeMapping(id) {
    await api(`/api/settings/sso/mappings/${id}`, { method: 'DELETE' });
    await load();
  }

  if (!data) return <p className="muted">Loading SSO & IAM…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>SSO & IAM</h1>
        <p>Microsoft Entra OIDC, claim→role mapping, and MFA gates for platform admin / CISO.</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="glass">
          <div className="stat-label">Entra configured</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {data.entra_configured ? 'Yes' : 'No'}
          </div>
          <p className="muted">Set ENTRA_* env vars for live OIDC.</p>
        </div>
        <div className="glass">
          <div className="stat-label">MFA required roles</div>
          <div className="pill-row">
            {(data.mfa_required_roles || []).map((r) => (
              <span className="pill" key={r}>{r}</span>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 8 }}>Enforce with MFA_ENFORCE=true.</p>
        </div>
        <div className="glass">
          <div className="stat-label">Role mappings</div>
          <div className="stat-value">{(data.mappings || []).length}</div>
        </div>
      </div>

      {msg && <p className="muted">{msg}</p>}

      <div className="grid grid-2">
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>SSO configuration</h3>
          <div className="form-row">
            <label>Provider</label>
            <select
              value={config.provider || 'entra'}
              onChange={(e) => setConfig({ ...config, provider: e.target.value })}
            >
              <option value="entra">Microsoft Entra ID</option>
              <option value="saml">SAML (planned)</option>
            </select>
          </div>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={!!config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                style={{ width: 'auto', marginRight: 8 }}
              />
              Enable SSO for this tenant
            </label>
          </div>
          <div className="form-row">
            <label>
              <input
                type="checkbox"
                checked={config.jit_provision !== false}
                onChange={(e) => setConfig({ ...config, jit_provision: e.target.checked })}
                style={{ width: 'auto', marginRight: 8 }}
              />
              JIT provision unknown users
            </label>
          </div>
          <div className="form-row">
            <label>Default role (JIT)</label>
            <select
              value={config.default_role || 'viewer'}
              onChange={(e) => setConfig({ ...config, default_role: e.target.value })}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveConfig}>Save SSO config</button>
        </div>

        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Claim → role mappings</h3>
          <div className="form-row">
            <label>Claim name</label>
            <input
              value={mapping.claim_name}
              onChange={(e) => setMapping({ ...mapping, claim_name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Claim value</label>
            <input
              value={mapping.claim_value}
              onChange={(e) => setMapping({ ...mapping, claim_value: e.target.value })}
              placeholder="AgentRadar.Analysts"
            />
          </div>
          <div className="form-row">
            <label>Role</label>
            <select
              value={mapping.role}
              onChange={(e) => setMapping({ ...mapping, role: e.target.value })}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={addMapping}>Add mapping</button>

          <div style={{ marginTop: 16 }}>
            {(data.mappings || []).map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>{m.claim_value}</strong>
                  <div className="muted" style={{ fontSize: 12 }}>{m.claim_name} → {m.role}</div>
                </div>
                <button className="btn btn-danger" onClick={() => removeMapping(m.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
