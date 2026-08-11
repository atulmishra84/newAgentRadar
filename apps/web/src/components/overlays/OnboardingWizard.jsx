import useStore from '../../store/useStore'

export default function OnboardingWizard() {
  const closeOnboarding = useStore(s => s.closeOnboarding)

  return (
    <>
      <div className="modal-backdrop show" onClick={closeOnboarding} />
      <div className="modal show" style={{ width: 500 }}>
        <div style={{ padding: '30px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>👋</div>
          <div style={{ fontWeight: 800, fontSize: 24, color: 'var(--text-primary)', marginBottom: 12 }}>Welcome to AgentRadar</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 30 }}>
            Your platform is ready. We have automatically detected 12 AI agents running in your environments.
            We recommend running a full network scan to discover shadow AI usage.
          </div>
          <button className="btn primary" style={{ width: '100%', padding: '12px' }} onClick={closeOnboarding}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </>
  )
}
