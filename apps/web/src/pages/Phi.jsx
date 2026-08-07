import { useEffect, useState } from 'react';
import { api } from '../api';
import AgentDrawer from '../components/AgentDrawer';

export default function Phi() {
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: 'signed', signatory: '', document_url: '' });

  async function load() {
    const d = await api('/api/baa/phi');
    setAgents(d.agents);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function saveBaa(agentId) {
    await api(`/api/baa/${agentId}`, {
      method: 'PUT',
      body: {
        ...form,
        signed_at: form.status === 'signed' ? new Date().toISOString() : null,
      },
    });
    await load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>PHI Exposure</h1>
        <p>Healthcare agents touching patient data — track BAA status and HIPAA risk.</p>
      </div>
      <div className="glass" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>BAA</th>
              <th>Risk</th>
              <th>Signatory</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td onClick={() => setSelected(a.id)}>{a.name}</td>
                <td>
                  <span className={`badge badge-${a.baa_status === 'signed' ? 'ok' : a.baa_status === 'pending' ? 'high' : 'danger'}`}>
                    {a.baa_status}
                  </span>
                </td>
                <td>{a.risk_score}</td>
                <td>{a.signatory || '—'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">
                    <select
                      style={{ width: 120 }}
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="signed">Signed</option>
                      <option value="pending">Pending</option>
                      <option value="missing">Missing</option>
                    </select>
                    <input
                      style={{ width: 140 }}
                      placeholder="Signatory"
                      value={form.signatory}
                      onChange={(e) => setForm({ ...form, signatory: e.target.value })}
                    />
                    <button className="btn btn-primary" onClick={() => saveBaa(a.id)}>Save BAA</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AgentDrawer agentId={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
