import { useState } from 'react'
import useStore from '../store/useStore'
import { computeViolations } from '../lib/helpers'
import { policiesAPI } from '../lib/api'

const COND_LABEL = {
  pii_no_gdpr:    'PII access without GDPR',
  shadow_critical:'Shadow + Critical risk',
  unknown_proto:  'Unknown protocol',
  cloud_no_soc2:  'Cloud without SOC2',
  phi_no_hipaa:   'PHI without HIPAA',
  fhir_no_hipaa:  'FHIR without HIPAA',
}
const ACT_LABEL  = { flag: '🚩 Flag for review', alert: '🔔 Alert CISO', quarantine: '🔒 Auto-quarantine' }
const ACT_COLORS = { flag: 'var(--amber)', alert: 'var(--red)', quarantine: 'var(--brand)' }

export default function PolicyEngine() {
  const policies   = useStore(s => s.policies)
  const agents     = useStore(s => s.agents)
  const togglePolicy = useStore(s => s.togglePolicy)
  const openModal  = useStore(s => s.openModal)
  const closeModal = useStore(s => s.closeModal)
  const modalOpen  = useStore(s => s.modalOpen)
  const addPolicy  = useStore(s => s.addPolicy)

  const [newPolicy, setNewPolicy] = useState({ name: '', cond: 'pii_no_gdpr', act: 'flag', desc: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const violations = computeViolations(agents, policies)

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Active Policies', value: policies.filter(p => p.on).length },
          { label: 'Total Rules', value: policies.length },
          { label: 'Active Violations', value: violations.length },
          { label: 'Agents Affected', value: new Set(violations.map(v => v.agent.id)).size },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Policy rules */}
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Policy Rules</div>
            <button className="btn primary sm" onClick={() => openModal('add-policy')}>+ New Rule</button>
          </div>
          <div>
            {policies.map(p => (
              <div key={p.id} style={{ padding: '14px 20px', borderBottom: '1px solid rgba(200,210,240,0.2)', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: p.on ? 1 : 0.55 }}>
                {/* Toggle */}
                <label className="policy-toggle">
                  <input type="checkbox" checked={p.on} onChange={() => togglePolicy(p.id)} />
                  <span className="policy-toggle-slider" />
                </label>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{p.desc}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--brand-bg)', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}>
                      IF: {COND_LABEL[p.cond] || p.cond}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: p.on ? 'var(--red-bg)' : 'rgba(200,210,240,0.3)', color: p.on ? 'var(--red-text)' : 'var(--text-muted)', border: `1px solid ${p.on ? 'var(--red-border)' : 'rgba(200,210,240,0.3)'}` }}>
                      THEN: {ACT_LABEL[p.act] || p.act}
                    </span>
                    {/* Violation count badge */}
                    {(() => {
                      const n = violations.filter(v => v.policy.id === p.id).length
                      return n > 0 ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--amber-bg)', color: 'var(--amber-text)', border: '1px solid var(--amber-border)' }}>⚠ {n} violation{n > 1 ? 's' : ''}</span> : null
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Violations panel */}
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', fontWeight: 700, fontSize: 13 }}>
            Active Violations ({violations.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {violations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                ✅ No active policy violations — governance posture is healthy
              </div>
            ) : violations.map((v, i) => (
              <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(200,210,240,0.15)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                  <span className={`rtag rt-${v.agent.risk}`}>{v.agent.risk}</span>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', flex: 1 }}>{v.agent.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Policy: <span style={{ color: 'var(--amber-text)', fontWeight: 600 }}>{v.policy.name}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Action: {ACT_LABEL[v.policy.act] || v.policy.act}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Policy Modal */}
      {modalOpen === 'add-policy' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>New Policy Rule</div>
              <button 
                onClick={closeModal}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Policy Name</div>
                <input 
                  value={newPolicy.name}
                  onChange={e => setNewPolicy(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. No PII without GDPR pass"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', color: '#374151' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Condition</div>
                  <select 
                    value={newPolicy.cond}
                    onChange={e => setNewPolicy(p => ({ ...p, cond: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', appearance: 'none', background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E") no-repeat right 12px center/16px', color: '#374151' }}
                  >
                    {Object.entries(COND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Action</div>
                  <select 
                    value={newPolicy.act}
                    onChange={e => setNewPolicy(p => ({ ...p, act: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', appearance: 'none', background: '#fff url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E") no-repeat right 12px center/16px', color: '#374151' }}
                  >
                    {Object.entries(ACT_LABEL).map(([k, v]) => <option key={k} value={k}>{v.replace(/^[^\w\s]+/, '').trim()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Description</div>
                <input 
                  value={newPolicy.desc}
                  onChange={e => setNewPolicy(p => ({ ...p, desc: e.target.value }))}
                  placeholder="Why this policy exists..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', color: '#374151' }}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{saveError}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={closeModal}
                  disabled={isSaving}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.6 : 1 }}
                >
                  Cancel
                </button>
                <button 
                  disabled={isSaving}
                  onClick={async () => {
                    setSaveError(null)
                    if (!newPolicy.name.trim()) {
                      setSaveError('Policy Name is required')
                      return
                    }
                    try {
                      setIsSaving(true)
                      const { data } = await policiesAPI.create(newPolicy)
                      addPolicy(data)
                      setNewPolicy({ name: '', cond: 'pii_no_gdpr', act: 'flag', desc: '' })
                      closeModal()
                    } catch (e) {
                      setSaveError(e.response?.data?.error || e.message || 'Failed to save policy')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isSaving ? 'wait' : 'pointer', opacity: isSaving ? 0.7 : 1 }}
                >
                  {isSaving ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
