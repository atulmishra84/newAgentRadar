import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState('');

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

  return (
    <div>
      <div className="page-head">
        <h1>Admin</h1>
        <p>RBAC user management and immutable admin audit log.</p>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="grid grid-2">
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Users</h3>
          {users.map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <div>
                <div>{u.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{u.email}</div>
              </div>
              <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} style={{ width: 160 }}>
                {['platform_admin', 'ciso', 'analyst', 'auditor', 'viewer'].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
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
