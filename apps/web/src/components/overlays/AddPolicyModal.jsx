export default function AddPolicyModal({ onClose }) {
  return (
    <>
      <div className="modal-backdrop show" onClick={onClose} />
      <div className="modal show" style={{ width: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Create Governance Policy</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <label className="lbl">Policy Name</label>
            <input className="inp" placeholder="e.g. Block unapproved LLM APIs" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="lbl">Condition</label>
            <select className="inp">
              <option>If shadow agent detected</option>
              <option>If PHI access without BAA</option>
              <option>If unknown protocol used</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="lbl">Action</label>
            <select className="inp">
              <option>Alert Security Team</option>
              <option>Quarantine Agent</option>
              <option>Flag for Review</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn outline" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={onClose}>Create Policy</button>
          </div>
        </div>
      </div>
    </>
  )
}
