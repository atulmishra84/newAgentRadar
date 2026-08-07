import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Integrations() {
  const [providers, setProviders] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [wedge, setWedge] = useState(null);
  const [demoMode, setDemoMode] = useState(true);
  const [form, setForm] = useState({ name: '', provider: 'azure', credentials: {}, mode: 'demo' });
  const [msg, setMsg] = useState('');
  const [hipaaNote, setHipaaNote] = useState('');

  const selected = providers.find((p) => p.id === form.provider);

  async function load() {
    const [p, c, w] = await Promise.all([
      api('/api/connectors/providers'),
      api('/api/connectors'),
      api('/api/settings/wedge'),
    ]);
    setProviders(p.providers);
    setDemoMode(!!p.discovery_demo_mode);
    setConnectors(c.connectors);
    setWedge(w);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setForm((f) => ({ ...f, mode: selected.modeDefault || 'demo' }));
  }, [selected?.id]);

  function setCred(field, value) {
    setForm((f) => ({ ...f, credentials: { ...f.credentials, [field]: value } }));
  }

  async function save() {
    setMsg('');
    const d = await api('/api/connectors', {
      method: 'POST',
      body: {
        name: form.name || `${selected?.name} connector`,
        provider: form.provider,
        credentials: form.credentials,
        mode: form.mode,
      },
    });
    setHipaaNote(d.hipaaNote || '');
    setMsg(`Connector saved · ${d.modeLabel || d.mode}`);
    setForm({ name: '', provider: form.provider, credentials: {}, mode: form.mode });
    await load();
  }

  async function test(id) {
    const d = await api(`/api/connectors/${id}/test`, { method: 'POST', body: {} });
    setMsg(d.ok ? d.message : d.error);
    await load();
  }

  async function scan(id) {
    setMsg('Scanning…');
    const d = await api(`/api/connectors/${id}/scan`, { method: 'POST', body: {} });
    setMsg(`Scan complete — ${d.agents_found} agents`);
    await load();
  }

  async function remove(id) {
    await api(`/api/connectors/${id}`, { method: 'DELETE' });
    await load();
  }

  async function scanCategory(category) {
    setMsg(`Scanning ${category}…`);
    await api(`/api/connectors/scan/category/${category}`, { method: 'POST', body: {} });
    setMsg(`Scan ${category} complete`);
  }

  async function scanAll() {
    setMsg('Scan all running…');
    const d = await api('/api/connectors/scan/all', { method: 'POST', body: {} });
    setMsg(`Scan all finished (${d.results.length} jobs)`);
  }

  const groups = [...new Set(providers.map((p) => p.group))];
  const firstWave = providers.filter((p) => p.firstWave);

  return (
    <div>
      <div className="page-head">
        <h1>Integrations</h1>
        <p>
          First-wave wedge first — Azure, Entra/EDR, GitHub, Epic — with clear demo vs live labeling.
          {demoMode ? ' Global discovery demo mode is on.' : ''}
        </p>
      </div>

      <div className="glass" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>First-wave connectors</h3>
        <p className="muted" style={{ marginTop: 0 }}>{wedge?.message}</p>
        <div className="pill-row">
          {firstWave.map((p) => (
            <button
              key={p.id}
              className="pill"
              style={{ cursor: 'pointer' }}
              onClick={() => setForm((f) => ({ ...f, provider: p.id, credentials: {} }))}
            >
              {p.name}
              {p.liveCapable ? ' · live-capable' : ' · demo'}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Link className="btn" to="/coverage">View coverage map</Link>
        </div>
      </div>

      <div className="toolbar">
        {['cloud', 'saas', 'healthcare', 'edr', 'siem', 'network', 'git'].map((c) => (
          <button key={c} className="btn" onClick={() => scanCategory(c)}>Scan {c}</button>
        ))}
        <button className="btn btn-primary" onClick={scanAll}>Scan All</button>
      </div>
      {msg && <p className="muted">{msg}</p>}

      <div className="grid grid-2">
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Add connector</h3>
          <div className="form-row">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Provider</label>
            <select
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value, credentials: {} })}
            >
              {groups.map((g) => (
                <optgroup key={g} label={g}>
                  {providers.filter((p) => p.group === g).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.firstWave ? ' ★' : ''}{p.liveCapable ? ' (live)' : ' (demo)'}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Mode</label>
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="demo">Demo / simulated scanner</option>
              <option value="live" disabled={!selected?.liveCapable}>Live API</option>
            </select>
          </div>
          {(selected?.fields || []).map((f) => (
            <div className="form-row" key={f}>
              <label>{f}</label>
              <input
                type={/secret|password|token|key/i.test(f) ? 'password' : 'text'}
                value={form.credentials[f] || ''}
                onChange={(e) => setCred(f, e.target.value)}
              />
            </div>
          ))}
          {selected?.hipaa && (
            <p style={{ color: '#8a5a0f', fontSize: 13 }}>
              HIPAA: ensure a BAA is signed before connecting Epic/Cerner/Meditech to production PHI systems.
            </p>
          )}
          <button className="btn btn-primary" onClick={save}>Save → Test → Scan</button>
          {hipaaNote && <p className="muted">{hipaaNote}</p>}
        </div>

        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Configured connectors</h3>
          {connectors.map((c) => (
            <div key={c.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{c.name}</strong>
                <span className={`badge ${c.mode === 'live' ? 'badge-live' : 'badge-demo'}`}>
                  {c.mode === 'live' ? 'Live' : 'Demo'}
                </span>
                {c.first_wave && <span className="badge badge-wave">First-wave</span>}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                {c.provider} · {c.status} · found {c.agents_found}
                {c.last_tested && ` · tested ${new Date(c.last_tested).toLocaleString()}`}
              </div>
              <div className="row-actions" style={{ marginTop: 6 }}>
                <button className="btn" onClick={() => test(c.id)}>Test</button>
                <button className="btn btn-primary" onClick={() => scan(c.id)}>Scan</button>
                <button className="btn btn-danger" onClick={() => remove(c.id)}>Delete</button>
              </div>
            </div>
          ))}
          {!connectors.length && <p className="muted">No connectors yet — add a first-wave source or use Scan All (demo).</p>}
        </div>
      </div>
    </div>
  );
}
