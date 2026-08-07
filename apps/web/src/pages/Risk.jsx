import { useEffect, useState } from 'react';
import { api } from '../api';
import RiskBadge from '../components/RiskBadge';
import AgentDrawer from '../components/AgentDrawer';

export default function Risk() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api('/api/risk/analytics').then(setData).catch(console.error);
  }, []);

  if (!data) return <p className="muted">Loading risk analytics…</p>;

  const maxTrend = Math.max(...(data.trend || []).map((t) => Number(t.avg_score)), 1);

  return (
    <div>
      <div className="page-head">
        <h1>Risk Analytics</h1>
        <p>Distribution, environment heatmap, top risks, remediation queue, and 7-day trend.</p>
      </div>
      <div className="grid grid-4">
        {Object.entries(data.distribution).map(([k, v]) => (
          <div className="glass" key={k}>
            <div className="stat-label">{k}</div>
            <div className="stat-value">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Risk by environment</h3>
          <div className="heatmap">
            {Object.entries(data.byEnv).map(([env, v]) => (
              <div
                className="heat-cell"
                key={env}
                style={{ background: `rgba(232, 93, 93, ${Math.min(0.45, v.avg / 120)})` }}
              >
                <strong>{env}</strong>
                <div className="muted">avg {v.avg}</div>
                <div style={{ fontSize: 12 }}>C{v.critical} H{v.high} M{v.medium} L{v.low}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>7-day risk trend</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
            {(data.trend || []).map((t) => (
              <div key={t.id} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: `${(Number(t.avg_score) / maxTrend) * 100}%`,
                    minHeight: 8,
                    background: 'linear-gradient(180deg, var(--accent), var(--accent-2))',
                    borderRadius: 6,
                  }}
                  title={String(t.avg_score)}
                />
                <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                  {new Date(t.captured_at).toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Top risk agents</h3>
          {data.top.map((a) => (
            <div
              key={a.id}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', cursor: 'pointer' }}
              onClick={() => setSelected(a.id)}
            >
              <span>{a.name}</span>
              <span>
                <RiskBadge level={a.risk_level} /> {a.risk_score}
              </span>
            </div>
          ))}
        </div>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Remediation queue</h3>
          {data.remediation.map((a) => (
            <div
              key={a.id}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', cursor: 'pointer' }}
              onClick={() => setSelected(a.id)}
            >
              <span>{a.name}</span>
              <span className="muted">{a.risk_level}</span>
            </div>
          ))}
        </div>
      </div>
      <AgentDrawer agentId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
