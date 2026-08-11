import { useState } from 'react'
import useStore from '../../store/useStore'

export default function AddAgentModal() {
  const closeModal = useStore(s => s.closeModal)
  const addAgent = useStore(s => s.addAgent)
  
  const [name, setName] = useState('')
  const [env, setEnv] = useState('Cloud')
  const [owner, setOwner] = useState('')

  const handleRegister = () => {
    if (!name.trim()) {
      alert('Enter a name.')
      return
    }
    const agentData = {
      name: name.trim(),
      type: 'Custom',
      env: env,
      protocols: ['HTTPS'],
      risk: 'medium',
      notes: 'Manually registered.',
      owner: owner || 'admin'
    }
    addAgent(agentData)
    closeModal()
  }

  return (
    <div className="modal show" style={{ display: 'flex' }}>
      <div className="modal-backdrop show" onClick={closeModal} />
      <div className="modal-box" style={{ width: 440 }}>
        <div className="modal-head">
          <div className="modal-title">Register New AI Agent</div>
          <button className="btn sm" onClick={closeModal}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label className="onb-lbl">Agent Name</label>
            <input className="login-inp" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Customer Support Bot" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="onb-lbl">Environment</label>
            <select className="login-inp" value={env} onChange={e => setEnv(e.target.value)}>
              <option>Cloud</option>
              <option>On-Prem</option>
              <option>Hybrid</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="onb-lbl">Owner</label>
            <input className="login-inp" value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. dev@company.com" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn outline" onClick={closeModal}>Cancel</button>
            <button className="btn primary" onClick={handleRegister}>Register Agent</button>
          </div>
        </div>
      </div>
    </div>
  )
}

