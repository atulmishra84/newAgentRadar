import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';

export default function Tenants() {
  const { user, setUser } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    adminEmail: '',
    adminName: '',
    adminPassword: '',
  });

  async function load() {
    const mine = await api('/api/tenants/mine');
    setMemberships(mine.memberships || []);
    if (user?.platform_operator) {
      try {
        const all = await api('/api/tenants');
        setTenants(all.tenants || []);
      } catch {
        setTenants([]);
      }
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [user?.platform_operator]);

  async function switchTenant(tenantId) {
    const d = await api(`/api/tenants/switch/${tenantId}`, { method: 'POST', body: {} });
    localStorage.setItem('ar_token', d.token);
    setUser(d.user);
    setMsg(`Switched to ${d.user.tenantSlug || tenantId}`);
    window.location.href = '/';
  }

  async function createTenant(e) {
    e.preventDefault();
    setError('');
    try {
      const d = await api('/api/tenants', { method: 'POST', body: form });
      setMsg(`Created tenant ${d.tenant.slug}`);
      setForm({ name: '', slug: '', adminEmail: '', adminName: '', adminPassword: '' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStatus(id, status) {
    await api(`/api/tenants/${id}/status`, { method: 'PATCH', body: { status } });
    await load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Tenants</h1>
        <p>Multi-tenant control plane — switch memberships and provision customer tenants.</p>
      </div>
      {msg && <p className="muted">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="glass" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Your memberships</h3>
        {memberships.map((m) => (
          <div key={m.tenant_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <div>
              <strong>{m.name}</strong>
              <div className="muted" style={{ fontSize: 12 }}>{m.slug} · {m.role} · {m.status}</div>
            </div>
            {m.tenant_id === user?.tenantId ? (
              <span className="badge badge-ok">Current</span>
            ) : (
              <button className="btn btn-primary" onClick={() => switchTenant(m.tenant_id)}>Switch</button>
            )}
          </div>
        ))}
        {!memberships.length && <p className="muted">No memberships found.</p>}
      </div>

      {user?.platform_operator && (
        <div className="grid grid-2">
          <form className="glass" onSubmit={createTenant}>
            <h3 style={{ marginTop: 0 }}>Provision tenant</h3>
            <div className="form-row"><label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-row"><label>Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
            <div className="form-row"><label>Admin email</label>
              <input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required /></div>
            <div className="form-row"><label>Admin name</label>
              <input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} /></div>
            <div className="form-row"><label>Admin password</label>
              <input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required /></div>
            <button className="btn btn-primary" type="submit">Create tenant</button>
          </form>
          <div className="glass">
            <h3 style={{ marginTop: 0 }}>All tenants</h3>
            {tenants.map((t) => (
              <div key={t.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
                <strong>{t.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t.slug} · {t.status} · {t.user_count} users · {t.agent_count} agents
                </div>
                <div className="row-actions" style={{ marginTop: 6 }}>
                  <button className="btn" onClick={() => setStatus(t.id, 'active')}>Activate</button>
                  <button className="btn" onClick={() => setStatus(t.id, 'suspended')}>Suspend</button>
                  <button className="btn btn-danger" onClick={() => setStatus(t.id, 'archived')}>Archive</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
