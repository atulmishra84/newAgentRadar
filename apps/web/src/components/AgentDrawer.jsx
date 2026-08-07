import { useEffect, useState } from 'react';
import { api } from '../api';
import RiskBadge from './RiskBadge';

export default function AgentDrawer({ agentId, onClose, onChanged }) {
  const [agent, setAgent] = useState(null);
  const [tab, setTab] = useState('identity');
  const [evidence, setEvidence] = useState(null);
  const [owner, setOwner] = useState('');
  const [acceptReason, setAcceptReason] = useState('');
  const [acceptUntil, setAcceptUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!agentId) return;
    setEvidence(null);
    setTab('identity');
    api(`/api/agents/${agentId}`).then((d) => {
      setAgent(d.agent);
      setOwner(d.agent.owner || '');
    });
  }, [agentId]);

  async function loadEvidence() {
    const pkg = await api(`/api/agents/${agentId}/evidence`);
    setEvidence(pkg);
    setTab('evidence');
  }

  async function act(path) {
    setBusy(true);
    setMsg('');
    try {
      const d = await api(`/api/agents/${agentId}/${path}`, { method: 'POST', body: {} });
      setAgent(d.agent);
      if (d.enforcement?.length) {
        setMsg(`Enforcement: ${d.enforcement.length} webhook delivery(ies)`);
      }
      onChanged?.(d.agent);
    } finally {
      setBusy(false);
    }
  }

  async function assignOwner() {
    setBusy(true);
    try {
      const d = await api(`/api/agents/${agentId}/assign-owner`, {
        method: 'POST',
        body: { owner },
      });
      setAgent(d.agent);
      onChanged?.(d.agent);
    } finally {
      setBusy(false);
    }
  }

  async function acceptRisk() {
    if (!acceptReason || !acceptUntil) {
      setMsg('Reason and expiry required for risk acceptance');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const d = await api(`/api/agents/${agentId}/accept-risk`, {
        method: 'POST',
        body: { reason: acceptReason, expires_at: acceptUntil },
      });
      setAgent(d.agent);
      setMsg('Risk accepted with expiry');
      onChanged?.(d.agent);
    } catch (e) {
      setMsg(e.message || 'Accept risk failed');
    } finally {
      setBusy(false);
    }
  }

  function downloadEvidence() {
    if (!evidence) return;
    const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentradar-evidence-${agent?.name || agentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!agentId) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--display)' }}>{agent?.name || 'Loading…'}</h2>
            <div className="muted" style={{ marginTop: 4 }}>
              Agent Passport · system of record
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {agent && (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <RiskBadge level={agent.risk_level} />
              <span className="badge badge-ok">{agent.confidence}</span>
              {agent.shadow && <span className="badge badge-shadow">Shadow</span>}
              {agent.phi_flag && <span className="badge badge-phi">PHI</span>}
              <span className="badge">{agent.lifecycle}</span>
              {agent.risk_accepted && <span className="badge badge-medium">Risk accepted</span>}
            </div>

            <div className="tabs">
              {['identity', 'risk', 'compliance', 'ownership', 'evidence'].map((t) => (
                <button
                  key={t}
                  className={`tab ${tab === t ? 'active' : ''}`}
                  onClick={() => (t === 'evidence' ? loadEvidence() : setTab(t))}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'identity' && (
              <div className="glass">
                <p><strong>Fingerprint:</strong></p>
                <p className="mono muted">{agent.fingerprint || '—'}</p>
                <p><strong>External ID:</strong> <span className="mono">{agent.external_id || '—'}</span></p>
                <p><strong>Category:</strong> {agent.category}</p>
                <p><strong>Environment:</strong> {agent.environment}</p>
                <p><strong>Hosting:</strong> {agent.hosting || '—'}</p>
                <p><strong>Model:</strong> {agent.model_ref || '—'}</p>
                <p><strong>Version:</strong> {agent.version || '—'}</p>
                <p><strong>Sources:</strong> {(agent.detection_sources || []).join(', ') || '—'}</p>
                <p><strong>Data stores:</strong> {(agent.data_stores || []).join(', ') || '—'}</p>
                <p><strong>Protocols:</strong> {(agent.protocols || []).join(', ') || '—'}</p>
              </div>
            )}

            {tab === 'risk' && (
              <div className="glass">
                <p>
                  <strong>Score:</strong> {agent.risk_score} / 100
                </p>
                <ul>
                  {(agent.risk_factors || []).map((f) => (
                    <li key={f.code}>
                      +{f.weight} {f.detail}
                    </li>
                  ))}
                </ul>
                <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />
                <h4 style={{ margin: '0 0 8px' }}>Accept risk (with expiry)</h4>
                <div className="form-row">
                  <label>Reason</label>
                  <textarea
                    rows={2}
                    value={acceptReason}
                    onChange={(e) => setAcceptReason(e.target.value)}
                    placeholder="Compensating control / business justification"
                  />
                </div>
                <div className="form-row">
                  <label>Expires</label>
                  <input
                    type="date"
                    value={acceptUntil}
                    onChange={(e) => setAcceptUntil(e.target.value)}
                  />
                </div>
                <button className="btn" disabled={busy} onClick={acceptRisk}>
                  Accept risk
                </button>
              </div>
            )}

            {tab === 'compliance' && (
              <div className="glass">
                {Object.entries(agent.framework_scores || {}).map(([fw, v]) => (
                  <div key={fw} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{fw}</span>
                      <span className={`badge badge-${v.status === 'fail' ? 'danger' : v.status === 'warn' ? 'high' : 'ok'}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${v.score || 0}%` }} />
                    </div>
                  </div>
                ))}
                <p style={{ marginTop: 12 }}>
                  <strong>BAA:</strong> {agent.baa_status}
                </p>
              </div>
            )}

            {tab === 'ownership' && (
              <div className="glass">
                <div className="form-row">
                  <label>Owner</label>
                  <input value={owner} onChange={(e) => setOwner(e.target.value)} />
                </div>
                <button className="btn btn-primary" disabled={busy} onClick={assignOwner}>
                  Assign owner
                </button>
                <p className="muted" style={{ marginTop: 12 }}>
                  Last reviewed: {agent.last_reviewed_at ? new Date(agent.last_reviewed_at).toLocaleDateString() : 'Never'}
                </p>
              </div>
            )}

            {tab === 'evidence' && (
              <div className="glass">
                <p className="muted" style={{ marginTop: 0 }}>
                  HIPAA/SOC2-oriented evidence package for audit and board packs.
                </p>
                <button className="btn btn-primary" onClick={downloadEvidence} disabled={!evidence}>
                  Download evidence JSON
                </button>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, marginTop: 12 }}>
                  {evidence ? JSON.stringify(evidence, null, 2) : 'Loading…'}
                </pre>
              </div>
            )}

            {msg && <p className="muted" style={{ marginTop: 12 }}>{msg}</p>}

            <div className="row-actions" style={{ marginTop: 16 }}>
              {agent.shadow && (
                <button className="btn btn-primary" disabled={busy} onClick={() => act('approve')}>
                  Approve
                </button>
              )}
              <button className="btn btn-danger" disabled={busy} onClick={() => act('quarantine')}>
                Quarantine
              </button>
              <button className="btn" disabled={busy} onClick={loadEvidence}>
                Evidence package
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
