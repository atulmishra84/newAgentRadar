import { useEffect, useState } from 'react';
import { api } from '../api';
import AgentDrawer from '../components/AgentDrawer';

export default function Phi() {
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: 'signed', signatory: '', document_url: '' });
  const [inspectMsg, setInspectMsg] = useState('');
  const [patterns, setPatterns] = useState([]);

  async function load() {
    const d = await api('/api/baa/phi');
    setAgents(d.agents);
  }

  useEffect(() => {
    load().catch(console.error);
    api('/api/phi-inspect/patterns').then((d) => setPatterns(d.patterns || [])).catch(() => {});
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

  async function inspectEstate() {
    setInspectMsg('Scanning estate metadata for PHI indicators…');
    const d = await api('/api/phi-inspect/estate', { method: 'POST', body: {} });
    setInspectMsg(`Inspected ${d.inspected} agents · ${d.flagged} flagged for PHI`);
    await load();
  }

  async function inspectOne(agentId) {
    await api(`/api/phi-inspect/${agentId}`, { method: 'POST', body: {} });
    await load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>PHI Exposure</h1>
        <p>
          BAA tracking plus metadata content inspection (MRN/SSN-like patterns, clinical stores) —
          does not open EHR patient records.
        </p>
      </div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={inspectEstate}>Run PHI content inspection</button>
      </div>
      {inspectMsg && <p className="muted">{inspectMsg}</p>}
      {!!patterns.length && (
        <div className="pill-row" style={{ marginBottom: 12 }}>
          {patterns.map((p) => (
            <span className="pill" key={p.code}>{p.code} (+{p.weight})</span>
          ))}
        </div>
      )}
      <div className="glass" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>BAA</th>
              <th>Findings</th>
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
                <td className="muted" style={{ fontSize: 12, maxWidth: 220 }}>
                  {(a.phi_findings || []).length
                    ? (a.phi_findings || []).map((f) => f.code || f).join(', ')
                    : '—'}
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
                    <button className="btn" onClick={() => inspectOne(a.id)}>Inspect</button>
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
