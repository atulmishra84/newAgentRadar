import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Models() {
  const [models, setModels] = useState([]);
  const [form, setForm] = useState({
    name: '',
    vendor: '',
    hosting_type: 'cloud',
    baa_available: false,
    soc2: false,
    hipaa_capable: false,
  });
  const [msg, setMsg] = useState('');

  async function load() {
    const d = await api('/api/models');
    setModels(d.models);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function save(e) {
    e.preventDefault();
    await api('/api/models', { method: 'POST', body: form });
    setMsg('Model saved');
    setForm({ name: '', vendor: '', hosting_type: 'cloud', baa_available: false, soc2: false, hipaa_capable: false });
    await load();
  }

  async function remove(id) {
    await api(`/api/models/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Model Registry</h1>
        <p>Foundation model inventory with BAA, SOC2, and HIPAA capability.</p>
      </div>
      {msg && <p className="muted">{msg}</p>}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <form className="glass" onSubmit={save}>
          <h3 style={{ marginTop: 0 }}>Add / update model</h3>
          <div className="form-row"><label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-row"><label>Vendor</label>
            <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} required /></div>
          <div className="form-row"><label>Hosting</label>
            <select value={form.hosting_type} onChange={(e) => setForm({ ...form, hosting_type: e.target.value })}>
              <option value="cloud">cloud</option>
              <option value="self_hosted">self_hosted</option>
              <option value="local">local</option>
            </select>
          </div>
          {['baa_available', 'soc2', 'hipaa_capable'].map((k) => (
            <label key={k} style={{ display: 'block', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={!!form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                style={{ width: 'auto', marginRight: 8 }}
              />
              {k}
            </label>
          ))}
          <button className="btn btn-primary" type="submit">Save model</button>
        </form>
      </div>
      <div className="grid grid-3">
        {models.map((m) => (
          <div className="glass" key={m.id}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--display)' }}>{m.name}</h3>
            <p className="muted">{m.vendor} · {m.hosting_type}</p>
            <p>Agents using model: <strong>{m.agent_count}</strong></p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {m.baa_available && <span className="badge badge-ok">BAA</span>}
              {m.soc2 && <span className="badge badge-ok">SOC2</span>}
              {m.hipaa_capable && <span className="badge badge-phi">HIPAA</span>}
              {m.hosting_type === 'local' && <span className="badge badge-high">Local</span>}
            </div>
            <button className="btn btn-danger" style={{ marginTop: 10 }} onClick={() => remove(m.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
