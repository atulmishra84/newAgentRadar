import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Compliance() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/api/compliance').then(setData).catch(console.error);
  }, []);

  if (!data) return <p className="muted">Loading compliance…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>Compliance</h1>
        <p>Eight-framework mapping across the AI agent estate.</p>
      </div>
      <div className="grid grid-2">
        {Object.entries(data.frameworks).map(([fw, v]) => (
          <div className="glass" key={fw}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{fw.replace(/_/g, ' ')}</h3>
              <strong>{v.passPct}%</strong>
            </div>
            <div className="bar" style={{ margin: '10px 0' }}>
              <span style={{ width: `${v.passPct}%` }} />
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              Pass {v.pass} · Fail {v.fail} · Warn {v.warn}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
