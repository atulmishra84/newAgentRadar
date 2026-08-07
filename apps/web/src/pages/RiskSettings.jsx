import { useEffect, useState } from 'react';
import { api } from '../api';

const LABELS = {
  phi: 'PHI access',
  pii: 'PII access',
  shadow: 'Shadow AI',
  compliance_per_fail: 'Per compliance fail',
  compliance_cap: 'Compliance cap',
  no_owner: 'No owner',
  never_reviewed: 'Never reviewed',
};

export default function RiskSettings() {
  const [weights, setWeights] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/api/settings/risk-weights').then((d) => {
      setWeights(d.weights);
      setDefaults(d.defaults);
    }).catch(console.error);
  }, []);

  async function save() {
    const d = await api('/api/settings/risk-weights', { method: 'PUT', body: { weights } });
    setWeights(d.weights);
    setMsg('Risk weights saved. Re-score agents on next update/scan.');
  }

  function reset() {
    setWeights({ ...defaults });
  }

  if (!weights) return <p className="muted">Loading risk weights…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>Risk weight settings</h1>
        <p>Tune the scoring formula for your tenant. Risk acceptance with expiry is available on each agent passport.</p>
      </div>
      {msg && <p className="muted">{msg}</p>}
      <div className="glass" style={{ maxWidth: 560 }}>
        {Object.keys(LABELS).map((key) => (
          <div className="form-row" key={key}>
            <label>{LABELS[key]} ({key})</label>
            <input
              type="number"
              value={weights[key] ?? ''}
              onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })}
            />
          </div>
        ))}
        <div className="row-actions">
          <button className="btn btn-primary" onClick={save}>Save weights</button>
          <button className="btn" onClick={reset}>Reset defaults</button>
        </div>
      </div>
    </div>
  );
}
