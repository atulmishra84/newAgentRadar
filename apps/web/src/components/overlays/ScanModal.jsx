import { useState, useEffect } from 'react'
import useStore from '../../store/useStore'

export default function ScanModal({ onClose }) {
  const [step, setStep] = useState(0)
  const addActivity = useStore(s => s.addActivity)

  useEffect(() => {
    let t1, t2, t3
    t1 = setTimeout(() => setStep(1), 1500)
    t2 = setTimeout(() => setStep(2), 3500)
    t3 = setTimeout(() => setStep(3), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  function finish() {
    addActivity({ type: 'scan', t: 'Full environment scan completed', m: 'System · just now', c: 'var(--brand)' })
    useStore.setState({ lastScan: new Date().toISOString() })
    onClose()
  }

  return (
    <>
      <div className="modal-backdrop show" onClick={step === 3 ? finish : undefined} />
      <div className="modal show" style={{ width: 400 }}>
        <div style={{ padding: '24px 30px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{step === 3 ? '✅' : '🔍'}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              {step === 0 ? 'Initializing Scanners...' : step === 1 ? 'Scanning Networks...' : step === 2 ? 'Analyzing Agents...' : 'Scan Complete'}
            </div>
          </div>
          <div style={{ height: 4, background: 'rgba(200,210,240,0.2)', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ height: '100%', background: 'var(--brand)', width: step === 0 ? '10%' : step === 1 ? '45%' : step === 2 ? '85%' : '100%', transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>AWS / Azure / GCP</span>
              <span style={{ color: step >= 1 ? 'var(--green-text)' : 'inherit' }}>{step >= 1 ? 'Done' : 'Pending'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Network / Ports</span>
              <span style={{ color: step >= 2 ? 'var(--green-text)' : 'inherit' }}>{step >= 2 ? 'Done' : 'Pending'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Identity / OAuth</span>
              <span style={{ color: step >= 3 ? 'var(--green-text)' : 'inherit' }}>{step >= 3 ? 'Done' : 'Pending'}</span>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <button className="btn primary" style={{ width: '100%' }} onClick={finish} disabled={step < 3}>
              {step < 3 ? 'Scanning...' : 'View Results'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
