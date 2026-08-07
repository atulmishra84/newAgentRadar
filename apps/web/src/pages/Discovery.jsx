import { useEffect, useState } from 'react';
import { api } from '../api';
import AgentTable from '../components/AgentTable';
import AgentDrawer from '../components/AgentDrawer';

export default function Discovery() {
  const [agents, setAgents] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const d = await api(`/api/agents?${params}`);
    setAgents(d.agents);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Agent Discovery</h1>
        <p>Full inventory of discovered AI agents across cloud, SaaS, healthcare, EDR, and code.</p>
      </div>
      <div className="toolbar">
        <input
          style={{ maxWidth: 260 }}
          placeholder="Search name or owner"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select style={{ maxWidth: 180 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {['cloud','saas','healthcare','ide','local','local_llm','framework','mcp','browser','ci','autonomous'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={load}>Filter</button>
      </div>
      <AgentTable agents={agents} onSelect={(a) => setSelected(a.id)} />
      <AgentDrawer agentId={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
