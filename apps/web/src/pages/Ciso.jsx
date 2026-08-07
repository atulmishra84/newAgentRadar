import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Ciso() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api('/api/reports/ciso').then(setReport).catch(console.error);
  }, []);

  async function exportPdf() {
    const blob = await api('/api/reports/ciso.pdf');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentradar-ciso-report.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportEvidence() {
    const pkg = await api('/api/agents/evidence/estate');
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentradar-estate-evidence.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!report) return <p className="muted">Loading CISO report…</p>;

  return (
    <div>
      <div className="page-head">
        <h1>CISO Report</h1>
        <p>Executive-ready AI risk posture — board PDF plus HIPAA/SOC2 estate evidence package.</p>
      </div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={exportPdf}>Export PDF</button>
        <button className="btn" onClick={exportEvidence}>Export estate evidence</button>
        <button className="btn" onClick={() => window.print()}>Print</button>
      </div>
      <div className="grid grid-3">
        <div className="glass">
          <div className="stat-label">Overall posture</div>
          <div className="stat-value">{report.posture}</div>
        </div>
        <div className="glass">
          <div className="stat-label">Total agents</div>
          <div className="stat-value">{report.estate.total}</div>
        </div>
        <div className="glass">
          <div className="stat-label">Shadow / PHI / Critical</div>
          <div className="stat-value" style={{ fontSize: '1.3rem' }}>
            {report.estate.shadow} / {report.estate.phi} / {report.estate.critical}
          </div>
        </div>
      </div>
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Key risks</h3>
          {report.keyRisks.map((r) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>{r.label}</span>
              <strong>{r.count}</strong>
            </div>
          ))}
        </div>
        <div className="glass">
          <h3 style={{ marginTop: 0 }}>Recommendations</h3>
          <ul>
            {report.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="glass" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Framework compliance</h3>
        {Object.entries(report.frameworks).map(([fw, v]) => (
          <div key={fw} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{fw}</span>
              <span>{v.passPct}%</span>
            </div>
            <div className="bar"><span style={{ width: `${v.passPct}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
