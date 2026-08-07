import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Coverage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/api/discovery/coverage').then(setData).catch(console.error);
  }, []);

  if (!data) return <p className="muted">Loading coverage map…</p>;

  const firstWave = (data.sources || []).filter((s) => s.firstWave);
  const rest = (data.sources || []).filter((s) => !s.firstWave);

  return (
    <div>
      <div className="page-head">
        <h1>Coverage Map</h1>
        <p>Connected sources vs blind spots — prioritize first-wave connectors for the 30-day land path.</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="glass">
          <div className="stat-label">Estate coverage</div>
          <div className="stat-value">{data.coveragePct}%</div>
          <div className="bar"><span style={{ width: `${data.coveragePct}%` }} /></div>
          <p className="muted">{data.connected} connected · {data.blind} blind spots</p>
        </div>
        <div className="glass">
          <div className="stat-label">First-wave coverage</div>
          <div className="stat-value">{data.firstWavePct ?? 0}%</div>
          <div className="bar"><span style={{ width: `${data.firstWavePct || 0}%` }} /></div>
          <p className="muted">{(data.firstWaveBlind || []).length} first-wave blind spots</p>
        </div>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Next actions</h3>
          <p className="muted" style={{ marginTop: 0 }}>Connect blind spots to close discovery gaps.</p>
          <Link className="btn btn-primary" to="/integrations">Connect sources</Link>
        </div>
      </div>

      <h3>First-wave</h3>
      <div className="heatmap" style={{ marginBottom: 20 }}>
        {firstWave.map((s) => (
          <SourceCell key={s.id} s={s} />
        ))}
      </div>

      <h3>Expand later</h3>
      <div className="heatmap">
        {rest.map((s) => (
          <SourceCell key={s.id} s={s} />
        ))}
      </div>
    </div>
  );
}

function SourceCell({ s }) {
  return (
    <div
      className="heat-cell"
      style={{
        borderColor: s.connected ? 'rgba(31,157,99,0.45)' : 'rgba(201,68,68,0.35)',
        background: s.connected ? 'rgba(31,157,99,0.08)' : 'rgba(201,68,68,0.06)',
      }}
    >
      <strong>{s.name}</strong>
      <div className="muted" style={{ fontSize: 12 }}>{s.group}</div>
      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {s.connected ? (
          <span className="badge badge-ok">Connected</span>
        ) : (
          <span className="badge badge-danger">Blind spot</span>
        )}
        {s.firstWave && <span className="badge badge-wave">First-wave</span>}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Agents: {s.agents_found}
        {s.last_scanned && ` · ${new Date(s.last_scanned).toLocaleString()}`}
      </div>
      {!s.connected && (
        <Link to="/integrations" className="btn" style={{ display: 'inline-block', marginTop: 8, textDecoration: 'none' }}>
          Connect
        </Link>
      )}
    </div>
  );
}
