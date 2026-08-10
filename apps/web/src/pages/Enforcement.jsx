import { useEffect, useState } from 'react';
import { api } from '../api';

const KINDS = [
  { id: 'servicenow', label: 'ServiceNow' },
  { id: 'zscaler', label: 'Zscaler' },
  { id: 'edr', label: 'CrowdStrike / EDR' },
  { id: 'entra', label: 'Microsoft Entra' },
  { id: 'generic', label: 'Generic webhook' },
];

export default function Enforcement() {
  const [webhooks, setWebhooks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [form, setForm] = useState({
    name: '',
    kind: 'servicenow',
    url: '',
    enabled: true,
    events: ['agent.quarantine', 'agent.approve'],
    secret: '',
  });
  const [msg, setMsg] = useState('');

  async function load() {
    const [w, d] = await Promise.all([
      api('/api/enforcement/webhooks'),
      api('/api/enforcement/deliveries'),
    ]);
    setWebhooks(w.webhooks || []);
    setDeliveries(d.deliveries || []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function save() {
    await api('/api/enforcement/webhooks', { method: 'POST', body: form });
    setMsg('Webhook saved');
    setForm({ name: '', kind: 'servicenow', url: '', enabled: true, events: ['agent.quarantine', 'agent.approve'], secret: '' });
    await load();
  }

  async function remove(id) {
    await api(`/api/enforcement/webhooks/${id}`, { method: 'DELETE' });
    await load();
  }

  function toggleEvent(ev) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  }

  return (
    <div>
      <div className="page-head">
        <h1>Enforcement webhooks</h1>
        <p>
          Quarantine/approve actions fan out to ServiceNow, Zscaler, EDR, and Entra with provider-specific hints.
        </p>
      </div>
      {msg && <p className="muted">{msg}</p>}

      <div className="grid grid-2">
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Add webhook</h3>
          <div className="form-row">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Kind</label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="form-row">
            <label>Secret / native credentials (optional)</label>
            <input
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              type="password"
              placeholder='HMAC secret or JSON e.g. {"username":"","password":""}'
            />
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Native adapters: ServiceNow incident API, Zscaler policy POST, CrowdStrike contain, Entra Graph signal.
            Example URLs stay simulated.
          </p>
          <div className="form-row">
            <label>Events</label>
            {['agent.quarantine', 'agent.approve'].map((ev) => (
              <label key={ev} style={{ marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={form.events.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                  style={{ width: 'auto', marginRight: 8 }}
                />
                {ev}
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={save}>Save webhook</button>
        </div>

        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Configured webhooks</h3>
          {webhooks.map((w) => (
            <div key={w.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <strong>{w.name}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {w.kind} · {w.enabled ? 'enabled' : 'disabled'} · {(w.events || []).join(', ')}
              </div>
              <div className="mono muted">{w.url}</div>
              <button className="btn btn-danger" style={{ marginTop: 6 }} onClick={() => remove(w.id)}>Delete</button>
            </div>
          ))}
          {!webhooks.length && <p className="muted">No webhooks yet.</p>}
        </div>
      </div>

      <div className="glass" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Recent deliveries</h3>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Webhook</th>
              <th>Status</th>
              <th>Hint</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.slice(0, 20).map((d) => (
              <tr key={d.id} style={{ cursor: 'default' }}>
                <td>{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                <td>{d.event}</td>
                <td>{d.webhook_name || d.kind || '—'}</td>
                <td>
                  <span className={`badge ${d.status === 'delivered' || d.status === 'ok' ? 'badge-ok' : 'badge-high'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {d.payload?.enforcement_hint?.action
                    || d.enforcement_hint
                    || d.hint
                    || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!deliveries.length && <p className="muted">Approve or quarantine an agent to generate deliveries.</p>}
      </div>
    </div>
  );
}
