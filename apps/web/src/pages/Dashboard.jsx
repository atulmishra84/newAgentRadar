import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [wedge, setWedge] = useState(null);
  const [risk, setRisk] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api('/api/agents/stats'),
      api('/api/discovery/coverage'),
      api('/api/settings/wedge'),
      api('/api/risk/analytics'),
    ])
      .then(([s, c, w, r]) => {
        setStats(s);
        setCoverage(c);
        setWedge(w);
        setRisk(r);
      })
      .catch(console.error);
  }, []);

  async function exportEstateEvidence() {
    setMsg('Building estate evidence…');
    try {
      const pkg = await api('/api/agents/evidence/estate');
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agentradar-estate-evidence.json';
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Estate evidence downloaded (HIPAA/SOC2 package).');
    } catch (e) {
      setMsg(e.message || 'Export failed');
    }
  }

  if (!stats || !coverage) return <p className="muted">Loading estate…</p>;

  const cards = [
    ['Total agents', stats.total],
    ['Shadow AI', stats.shadow],
    ['PHI agents', stats.phi],
    ['Critical risk', stats.critical],
    ['Avg risk', Math.round(stats.avg_risk)],
    ['Missing BAA', stats.phi_no_baa],
    ['Unowned', stats.unowned],
    ['Never reviewed', stats.never_reviewed],
  ];

  const trend = risk?.trend || [];
  const maxTrend = Math.max(...trend.map((t) => Number(t.avg_score)), 1);
  const dist = risk?.distribution || {};
  const distTotal = Object.values(dist).reduce((a, b) => a + Number(b), 0) || 1;

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>Your CMDB for AI agents — estate posture, first-wave coverage, and audit-ready evidence.</p>
      </div>

      <div className="glass wedge-banner">
        <div>
          <h2>30-day land path</h2>
          <p className="muted" style={{ margin: 0 }}>
            {wedge?.message || 'Start with Azure, Entra, EDR, GitHub, and Epic — then expand.'}
          </p>
          <div className="pill-row">
            {(wedge?.providers || []).map((p) => (
              <span className="pill" key={p.id}>{p.name}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <Link className="btn btn-primary" to="/integrations">Connect first-wave sources</Link>
          <Link className="btn" to="/coverage">Open coverage map</Link>
          <button className="btn" onClick={exportEstateEvidence}>Export estate evidence</button>
        </div>
      </div>
      {msg && <p className="muted">{msg}</p>}

      <div className="grid grid-4">
        {cards.map(([label, value]) => (
          <div className="glass" key={label} style={{ animation: 'fadeUp 0.45s ease both' }}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <div className="glass">
          <div className="stat-label">First-wave coverage</div>
          <div className="donut-row" style={{ marginTop: 12 }}>
            <div
              className="donut"
              style={{ '--p': coverage.firstWavePct || 0 }}
              data-label={`${coverage.firstWavePct || 0}%`}
            />
            <div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{coverage.coveragePct}%</div>
              <div className="muted" style={{ fontSize: 13 }}>Overall estate · {coverage.blind} blind spots</div>
              {(coverage.firstWaveBlind || []).slice(0, 3).map((s) => (
                <div key={s.id} style={{ marginTop: 6 }}>
                  <span className="badge badge-danger">Blind</span>{' '}
                  <Link to="/integrations">{s.name}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Risk trend (7d)</h3>
          <div className="chart-bars">
            {trend.map((t) => (
              <div className="col" key={t.id}>
                <i style={{ height: `${(Number(t.avg_score) / maxTrend) * 100}%` }} />
                <em>{new Date(t.captured_at).toLocaleDateString(undefined, { weekday: 'narrow' })}</em>
              </div>
            ))}
            {!trend.length && <p className="muted">No snapshots yet</p>}
          </div>
        </div>

        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Risk mix</h3>
          {Object.entries(dist).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
              <div className="bar"><span style={{ width: `${(Number(v) / distTotal) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <Link className="glass" to="/operations" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ marginTop: 0 }}>Operations queue</h3>
          <p className="muted">Clear shadow, BAA, owner, and review backlog.</p>
        </Link>
        <Link className="glass" to="/shadow" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ marginTop: 0 }}>Shadow AI</h3>
          <p className="muted">{stats.shadow} unauthorized agents need decide.</p>
        </Link>
        <Link className="glass" to="/ciso" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 style={{ marginTop: 0 }}>CISO Report</h3>
          <p className="muted">Board-ready posture, PDF, and evidence export.</p>
        </Link>
      </div>
    </div>
  );
}
