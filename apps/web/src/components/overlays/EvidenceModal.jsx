import { useState } from 'react'
import useStore from '../../store/useStore'

export default function EvidenceModal() {
  const closeModal = useStore(s => s.closeModal)
  
  const [agents, setAgents] = useState(true)
  const [compliance, setCompliance] = useState(true)
  const [risks, setRisks] = useState(true)
  const [approvals, setApprovals] = useState(true)
  const [scans, setScans] = useState(true)
  const [gdpr, setGdpr] = useState(true)
  const [violations, setViolations] = useState(false)
  const [encrypt, setEncrypt] = useState(false)
  
  const handleDownload = () => {
    alert('Generating Evidence Package ZIP...\n(Simulated in demo mode)')
    closeModal()
  }

  return (
    <div className="modal show" id="modal-evidence" style={{ display: 'flex' }}>
      <div className="modal-box" style={{ width: 520, maxWidth: '96vw' }}>
        <div className="modal-head">
          <div className="modal-title">Export Evidence Package</div>
          <button className="btn sm" onClick={closeModal}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Select the evidence to include in your compliance export. The package downloads as a ZIP file suitable for auditor review.</div>
          <div id="evidence-items">
            <div className="evidence-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--glass-border-dim)' }}><span style={{ fontSize: 20 }}>📋</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>Agent Inventory</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All registered agents — name, type, env, risk, owner, first detected</div></div><input type="checkbox" checked={agents} onChange={e => setAgents(e.target.checked)} /></div>
            <div className="evidence-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--glass-border-dim)' }}><span style={{ fontSize: 20 }}>✅</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>Compliance Matrix</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pass/warn/fail per agent per framework (SOC 2, HIPAA, GDPR, NIST, EU AI Act…)</div></div><input type="checkbox" checked={compliance} onChange={e => setCompliance(e.target.checked)} /></div>
            <div className="evidence-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--glass-border-dim)' }}><span style={{ fontSize: 20 }}>⚖</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>Risk Acceptance Records</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All accepted risks with owner, reason, date, expiry</div></div><input type="checkbox" checked={risks} onChange={e => setRisks(e.target.checked)} /></div>
            <div className="evidence-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--glass-border-dim)' }}><span style={{ fontSize: 20 }}>✔</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>Approval Workflow Log</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All agent approvals with approver, date, expiry countdown</div></div><input type="checkbox" checked={approvals} onChange={e => setApprovals(e.target.checked)} /></div>
            <div className="evidence-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--glass-border-dim)' }}><span style={{ fontSize: 20 }}>🔍</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>Scan History</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last 10 scans per scanner — timestamp, agents found, duration</div></div><input type="checkbox" checked={scans} onChange={e => setScans(e.target.checked)} /></div>
            <div className="evidence-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--glass-border-dim)' }}><span style={{ fontSize: 20 }}>📜</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>GDPR Article 30 Report</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Records of processing per AI agent — controller, purpose, data categories, recipients</div></div><input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} /></div>
            <div className="evidence-item" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}><span style={{ fontSize: 20 }}>📝</span><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>Policy Violations Log</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All policy violations with status, remediation, SLA compliance</div></div><input type="checkbox" checked={violations} onChange={e => setViolations(e.target.checked)} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={encrypt} onChange={e => setEncrypt(e.target.checked)} /> Password-protect the export (AES-256)
            </label>
          </div>
        </div>
        <div className="factions">
          <button className="btn" onClick={closeModal}>Cancel</button>
          <button className="btn primary" onClick={handleDownload}>↓ Download Evidence Package</button>
        </div>
      </div>
    </div>
  )
}

