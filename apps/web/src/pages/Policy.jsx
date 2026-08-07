import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Policy() {
  const [policies, setPolicies] = useState([]);
  const [agents, setAgents] = useState([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const d = await api('/api/policies');
    setPolicies(d.policies);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function run(id, remediate = false) {
    setMsg('Running…');
    const path = remediate ? `/api/policies/${id}/remediate` : `/api/policies/${id}/run`;
    const d = await api(path, { method: 'POST', body: {} });
    setMsg(`${d.policy.name}: ${d.violations.length} violation(s)`);
    await load();
  }

  async function remediateAll() {
    setMsg('Auto-remediating all policies…');
    const d = await api('/api/policies/remediate-all', { method: 'POST', body: {} });
    setMsg(`Completed ${d.results.length} policies`);
    await load();
  }

  async function showAgents(id) {
    const d = await api(`/api/policies/${id}/agents`);
    setAgents(d.agents);
  }

  return (
    <div>
      <div className="page-head">
        <h1>Policy Engine</h1>
        <p>Six built-in governance policies with run and auto-remediate.</p>
      </div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={remediateAll}>Auto-remediate all</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <div className="grid grid-2">
        {policies.map((p) => (
          <div className="glass" key={p.id}>
            <h3 style={{ marginTop: 0 }}>{p.name}</h3>
            <p className="muted">{p.description}</p>
            <p>
              Violations: <strong>{p.violation_count}</strong>
              {p.auto_remediate && <span className="badge badge-ok" style={{ marginLeft: 8 }}>auto</span>}
            </p>
            <div className="row-actions">
              <button className="btn" onClick={() => run(p.id, false)}>Run</button>
              <button className="btn btn-primary" onClick={() => run(p.id, true)}>Remediate</button>
              <button className="btn btn-ghost" onClick={() => showAgents(p.id)}>Agents</button>
            </div>
          </div>
        ))}
      </div>
      {!!agents.length && (
        <div className="glass" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Violating agents</h3>
          {agents.map((a) => (
            <div key={a.id}>{a.name} — {a.risk_level}</div>
          ))}
        </div>
      )}
    </div>
  );
}
