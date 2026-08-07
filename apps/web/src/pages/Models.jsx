import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Models() {
  const [models, setModels] = useState([]);

  useEffect(() => {
    api('/api/models').then((d) => setModels(d.models)).catch(console.error);
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>Model Registry</h1>
        <p>Foundation model inventory with BAA, SOC2, and HIPAA capability.</p>
      </div>
      <div className="grid grid-3">
        {models.map((m) => (
          <div className="glass" key={m.id}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--display)' }}>{m.name}</h3>
            <p className="muted">{m.vendor} · {m.hosting_type}</p>
            <p>Agents using model: <strong>{m.agent_count}</strong></p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {m.baa_available && <span className="badge badge-ok">BAA</span>}
              {m.soc2 && <span className="badge badge-ok">SOC2</span>}
              {m.hipaa_capable && <span className="badge badge-phi">HIPAA</span>}
              {m.hosting_type === 'local' && <span className="badge badge-high">Local</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
