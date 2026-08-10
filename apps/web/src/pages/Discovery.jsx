import { useEffect, useState } from 'react';
import { api } from '../api';
import AgentTable from '../components/AgentTable';
import AgentDrawer from '../components/AgentDrawer';

export default function Discovery() {
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [scanState, setScanState] = useState(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const [d, ev, st] = await Promise.all([
      api(`/api/agents?${params}`),
      api('/api/discovery/events'),
      api('/api/discovery/scan-state'),
    ]);
    setAgents(d.agents);
    setEvents(ev.events || []);
    setScanState(st.state);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Agent Discovery</h1>
        <p>Full inventory plus discovery activity and live scan state.</p>
      </div>
      <div className="toolbar">
        <input
          style={{ maxWidth: 260 }}
          placeholder="Search name, owner, fingerprint"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select style={{ maxWidth: 180 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {['cloud','saas','healthcare','ide','local','local_llm','framework','mcp','browser','ci','autonomous'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={load}>Filter / refresh</button>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Scan state</h3>
          {scanState && typeof scanState === 'object' && Object.keys(scanState).length ? (
            <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(scanState, null, 2)}
            </pre>
          ) : (
            <p className="muted" style={{ margin: 0 }}>No active scan. Run a scan from Integrations.</p>
          )}
        </div>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Recent discovery events</h3>
          {(events || []).slice(0, 8).map((e) => (
            <div key={e.id} className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
              {e.created_at ? new Date(e.created_at).toLocaleString() : '—'} — {e.provider || e.source || 'scan'} —{' '}
              {e.message || e.event_type || e.agents_found != null ? `+${e.agents_found || 0} agents` : e.detail || 'event'}
            </div>
          ))}
          {!events?.length && <p className="muted" style={{ margin: 0 }}>No events yet.</p>}
        </div>
      </div>

      <AgentTable agents={agents} onSelect={(a) => setSelected(a.id)} />
      <AgentDrawer agentId={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
