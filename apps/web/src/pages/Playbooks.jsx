import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Playbooks() {
  const [playbooks, setPlaybooks] = useState([]);
  const [runs, setRuns] = useState([]);
  const [log, setLog] = useState(null);

  async function load() {
    const [p, r] = await Promise.all([api('/api/playbooks'), api('/api/playbooks/runs')]);
    setPlaybooks(p.playbooks);
    setRuns(r.runs);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function run(id) {
    const d = await api(`/api/playbooks/${id}/run`, { method: 'POST', body: {} });
    setLog(d.run);
    await load();
  }

  async function toggleAuto(id, auto_mode) {
    await api(`/api/playbooks/${id}`, { method: 'PATCH', body: { auto_mode } });
    await load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Playbooks</h1>
        <p>Executable response playbooks with step logs, auto-mode, and history.</p>
      </div>
      <div className="grid grid-2">
        {playbooks.map((p) => (
          <div className="glass" key={p.id}>
            <h3 style={{ marginTop: 0 }}>{p.name}</h3>
            <p className="muted">{p.description}</p>
            <p className="muted">Trigger: {p.trigger_type}</p>
            <ol style={{ paddingLeft: 18, fontSize: 13 }}>
              {(p.steps || []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <div className="row-actions">
              <button className="btn btn-primary" onClick={() => run(p.id)}>Run now</button>
              <button className="btn" onClick={() => toggleAuto(p.id, !p.auto_mode)}>
                Auto: {p.auto_mode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {log && (
        <div className="glass" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Execution log</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(log.step_log || log, null, 2)}
          </pre>
        </div>
      )}
      <div className="glass" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Recent runs</h3>
        {runs.slice(0, 10).map((r) => (
          <div key={r.id} className="muted" style={{ marginBottom: 6 }}>
            {new Date(r.started_at).toLocaleString()} — {r.status}
          </div>
        ))}
      </div>
    </div>
  );
}
