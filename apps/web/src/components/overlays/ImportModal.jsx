import { useState, useRef } from 'react'
import useStore from '../../store/useStore'

export default function ImportModal() {
  const closeModal = useStore(s => s.closeModal)
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
    }
  }

  const handleImport = () => {
    if (!file) {
      alert('Please select a file to import.')
      return
    }
    alert(`Importing agents from ${file.name}...\n(Simulated in demo mode)`)
    closeModal()
  }

  return (
    <div className="modal show" id="modal-import" style={{ display: 'flex' }}>
      <div className="modal-box" style={{ width: 560, maxWidth: '96vw' }}>
        <div className="modal-head">
          <div className="modal-title">Bulk Agent Import</div>
          <button className="btn sm" onClick={closeModal}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div 
            className="import-drop" 
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed var(--glass-border)', padding: 32, textAlign: 'center', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', background: file ? 'var(--glass-white)' : 'var(--bg-secondary)' }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{file ? '📄' : '📥'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {file ? file.name : 'Drop CSV or JSON file here'}
            </div>
            {!file && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CSV: name, type, env, protocols, risk, owner, phi, domain</div>}
            <input type="file" ref={fileInputRef} accept=".csv,.json" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          <div id="import-summary" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            {file && `${(file.size / 1024).toFixed(1)} KB`}
          </div>
        </div>
        <div className="factions">
          <button className="btn" onClick={closeModal}>Cancel</button>
          <button className="btn primary" onClick={handleImport} disabled={!file}>Import All Agents</button>
        </div>
      </div>
    </div>
  )
}

