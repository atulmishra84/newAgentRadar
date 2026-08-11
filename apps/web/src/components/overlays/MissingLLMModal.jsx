import useStore from '../../store/useStore'
import { useNavigate } from 'react-router-dom'

export default function MissingLLMModal() {
  const closeModal = useStore(s => s.closeModal)
  const navigate = useNavigate()

  return (
    <>
      <div id="modal-backdrop" className="open" onClick={closeModal} style={{ zIndex: 999, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }} />
      <div className="modal open" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div 
          className="modal-box" 
          style={{ 
            maxWidth: 420, 
            width: '100%',
            padding: '32px 24px', 
            textAlign: 'center', 
            background: 'var(--bg-root, #ffffff)', 
            border: '1px solid var(--glass-border-dim, rgba(200,210,240,0.5))', 
            borderRadius: 20,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5) inset'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)', color: 'var(--brand, #6366f1)', marginBottom: 20 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20"></path>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, marginBottom: 12, color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>LLM Not Integrated</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28, padding: '0 12px' }}>
            Radar Assistant requires at least one configured LLM provider. Add an API key in Admin Settings to enable AI features.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button 
              className="btn" 
              onClick={closeModal}
              style={{ background: 'transparent', border: '1px solid var(--glass-border-dim)', color: 'var(--text-secondary)', padding: '10px 20px', borderRadius: 12 }}
            >
              Cancel
            </button>
            <button 
              className="btn primary" 
              onClick={() => {
                closeModal()
                navigate('/admin')
              }}
              style={{ padding: '10px 20px', borderRadius: 12 }}
            >
              Integrate Now
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
