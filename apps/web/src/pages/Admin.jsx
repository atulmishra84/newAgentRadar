import { useEffect, useState } from 'react';
import { api } from '../api';

const ROLES = ['platform_admin', 'ciso', 'analyst', 'auditor', 'viewer'];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    email: '',
    name: '',
    role: 'analyst',
    password: '',
  });

  async function load() {
    try {
      const [u, a] = await Promise.all([api('/api/admin/users'), api('/api/audit?limit=40')]);
      setUsers(u.users);
      setAudit(a.events);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function changeRole(id, role) {
    await api(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } });
    await load();
  }

  async function createUser(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/admin/users', { method: 'POST', body: form });
      setForm({ email: '', name: '', role: 'analyst', password: '' });
      setMsg('User created');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Admin</h1>
        <p>RBAC user management and immutable admin audit log.</p>
      </div>
      {error && <p className="error">{error}</p>}
      {msg && <p className="muted">{msg}</p>}
      <div className="grid grid-2">
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Users</h3>
          {users.map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <div>
                <div>{u.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {u.email} · MFA {u.mfa_enabled ? 'on' : 'off'}
                </div>
              </div>
              <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} style={{ width: 160 }}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <h3 style={{ marginTop: 0 }}>Create user</h3>
          <form onSubmit={createUser}>
            <div className="form-row">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>Temp password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn btn-primary" type="submit">Create user</button>
          </form>
        </div>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Audit log</h3>
          {audit.map((e) => (
            <div key={e.id} style={{ fontSize: 12, marginBottom: 8 }} className="muted">
              {new Date(e.created_at).toLocaleString()} — {e.actor_email} — {e.action}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
