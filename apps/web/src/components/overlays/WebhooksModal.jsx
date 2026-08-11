import { useState } from 'react'
import useStore from '../../store/useStore'

export default function WebhooksModal() {
  const closeModal = useStore(s => s.closeModal)
  
  const [url, setUrl] = useState('')
  const [shadow, setShadow] = useState(true)
  const [hipaa, setHipaa] = useState(true)
  const [critical, setCritical] = useState(true)
  const [scan, setScan] = useState(false)
  const [webhooks, setWebhooks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ar-webhooks') || '[]') } catch(e) { return [] }
  })

  const handleAdd = () => {
    if (!url || !url.startsWith('http')) {
      alert('Enter a valid HTTPS URL')
      return
    }
    const triggers = []
    if (shadow) triggers.push('shadow_detected')
    if (hipaa) triggers.push('hipaa_violation')
    if (critical) triggers.push('critical_risk')
    if (scan) triggers.push('scan_complete')
    
    const newHook = { id: Date.now(), url, triggers, active: true, createdAt: new Date().toISOString() }
    const updated = [...webhooks, newHook]
    setWebhooks(updated)
    localStorage.setItem('ar-webhooks', JSON.stringify(updated))
    setUrl('')
  }

  const handleRemove = (index) => {
    const updated = webhooks.filter((_, i) => i !== index)
    setWebhooks(updated)
    localStorage.setItem('ar-webhooks', JSON.stringify(updated))
  }

  const handleTest = () => {
    if (webhooks.length === 0) {
      alert('Add a webhook URL first')
      return
    }
    alert('Webhook test fired (simulated in demo mode)')
  }

  return (
    <div className="modal show" id="modal-webhooks" style={{ display: 'flex' }}>
      <div className="modal-box" style={{ width: 520, maxWidth: '96vw' }}>
        <div className="modal-head">
          <div className="modal-title">Webhook Configuration</div>
          <button className="btn sm" onClick={closeModal}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: 14 }}>
            <div className="onb-lbl" style={{ marginBottom: 5 }}>Webhook URL</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                className="login-inp" 
                placeholder="https://hooks.slack.com/services/..." 
                style={{ flex: 1 }} 
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
              <button className="btn sm primary" onClick={handleAdd}>Add</button>
            </div>
          </div>
          <div className="onb-lbl" style={{ marginBottom: 8 }}>Trigger events</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={shadow} onChange={e => setShadow(e.target.checked)} /> Shadow agent detected
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={hipaa} onChange={e => setHipaa(e.target.checked)} /> HIPAA violation
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={critical} onChange={e => setCritical(e.target.checked)} /> Critical risk found
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={scan} onChange={e => setScan(e.target.checked)} /> Scan completed
            </label>
          </div>
          <div className="onb-lbl" style={{ marginBottom: 6 }}>Configured webhooks</div>
          <div style={{ minHeight: 40, fontSize: 12, color: 'var(--text-muted)' }}>
            {webhooks.length === 0 ? (
              <div style={{ padding: '4px 0' }}>No webhooks configured</div>
            ) : (
              webhooks.map((w, i) => (
                <div key={w.id} className="webhook-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--glass-border-dim)' }}>
                  <span className="wh-url" style={{ color: 'var(--text-primary)' }}>{w.url}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{w.triggers.length} triggers</span>
                  <button className="btn sm" onClick={() => handleRemove(i)} style={{ fontSize: 9, color: 'var(--red-text)' }}>Remove</button>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="factions">
          <button className="btn" onClick={closeModal}>Close</button>
          <button className="btn primary" onClick={handleTest}>Test Webhook</button>
        </div>
      </div>
    </div>
  )
}

