import useStore from '../../store/useStore'

export default function SessionWarning() {
  const logout = useStore(s => s.logout)
  const closeSessionWarning = useStore(s => s.closeSessionWarning)

  return (
    <>
      <div className="modal-backdrop show" style={{ zIndex: 99999 }} />
      <div className="modal show" style={{ width: 400, zIndex: 100000 }}>
        <div style={{ padding: '24px 30px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>Session Expiring Soon</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 24 }}>
            For your security, your session will automatically expire in 2 minutes due to inactivity. Do you want to stay signed in?
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn outline" onClick={logout}>Sign Out</button>
            <button className="btn primary" onClick={closeSessionWarning}>Stay Signed In</button>
          </div>
        </div>
      </div>
    </>
  )
}
