import { useEffect, useState } from 'react';
import { api } from '../api';
import AgentDrawer from '../components/AgentDrawer';

function Queue({ title, items, onSelect, actions }) {
  return (
    <div className="glass">
      <h3 style={{ marginTop: 0 }}>
        {title} <span className="muted">({items.length})</span>
      </h3>
      {items.slice(0, 8).map((a) => (
        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <button className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => onSelect(a.id)}>
            {a.name}
          </button>
          {actions?.(a)}
        </div>
      ))}
      {!items.length && <p className="muted">Clear</p>}
    </div>
  );
}

export default function Operations() {
  const [queue, setQueue] = useState(null);
  const [selected, setSelected] = useState(null);

  async function load() {
    setQueue(await api('/api/ops/queue'));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function act(id, action) {
    await api(`/api/agents/${id}/${action}`, { method: 'POST', body: {} });
    await load();
  }

  if (!queue) return <p className="muted">Loading workbench…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>Operations Workbench</h1>
        <p>Daily SecOps queue — shadow, PHI/BAA, ownership, reviews, and high risk.</p>
      </div>
      <div className="grid grid-2">
        <Queue
          title="Shadow AI"
          items={queue.shadow}
          onSelect={setSelected}
          actions={(a) => (
            <div className="row-actions">
              <button className="btn btn-primary" onClick={() => act(a.id, 'approve')}>Approve</button>
              <button className="btn btn-danger" onClick={() => act(a.id, 'quarantine')}>Quarantine</button>
            </div>
          )}
        />
        <Queue title="PHI missing BAA" items={queue.phi_missing_baa} onSelect={setSelected} />
        <Queue title="Unowned" items={queue.unowned} onSelect={setSelected} />
        <Queue title="Never reviewed" items={queue.never_reviewed} onSelect={setSelected} />
        <Queue title="High / critical risk" items={queue.high_critical} onSelect={setSelected} />
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Discovery events</h3>
          {(queue.events || []).slice(0, 12).map((e) => (
            <div key={e.id} className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              {new Date(e.created_at).toLocaleString()} — {e.event_type}
            </div>
          ))}
          {!queue.events?.length && <p className="muted">No recent events</p>}
        </div>
      </div>
      <AgentDrawer agentId={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
