import { useEffect, useState } from 'react';
import { api } from '../api';
import AgentTable from '../components/AgentTable';
import AgentDrawer from '../components/AgentDrawer';

export default function Shadow() {
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(null);

  async function load() {
    const d = await api('/api/agents?shadow=true');
    setAgents(d.agents);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function quick(id, action) {
    await api(`/api/agents/${id}/${action}`, { method: 'POST', body: {} });
    await load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Shadow AI</h1>
        <p>Unauthorized agents from network, endpoint, code, and cloud discovery. Approve or quarantine.</p>
      </div>
      <div className="glass" style={{ marginBottom: 12 }}>
        {(agents || []).filter((a) => a.phi_flag).length > 0 && (
          <p style={{ color: '#ffb4b4', margin: 0 }}>
            HIPAA risk: shadow agents with PHI access detected — quarantine recommended until BAA review.
          </p>
        )}
        {!agents.filter((a) => a.phi_flag).length && (
          <p className="muted" style={{ margin: 0 }}>No PHI-linked shadow agents in current set.</p>
        )}
      </div>
      <AgentTable agents={agents} onSelect={(a) => setSelected(a.id)} />
      <div className="glass" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Quick actions</h3>
        {agents.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <span>{a.name}</span>
            <div className="row-actions">
              <button className="btn btn-primary" onClick={() => quick(a.id, 'approve')}>Approve</button>
              <button className="btn btn-danger" onClick={() => quick(a.id, 'quarantine')}>Quarantine</button>
            </div>
          </div>
        ))}
      </div>
      <AgentDrawer agentId={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
