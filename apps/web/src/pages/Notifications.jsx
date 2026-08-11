import useStore from '../store/useStore'

export default function Notifications() {
  const notifications = useStore(s => s.notifications)
  const markRead = useStore(s => s.markRead)

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Notifications</div>
          <button className="btn sm outline" onClick={() => markRead()}>Mark all as read</button>
        </div>
        <div>
          {notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
          ) : notifications.map(n => (
            <div key={n.id} style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,210,240,0.15)', display: 'flex', gap: 14, background: n.read ? 'transparent' : 'rgba(99,102,241,0.03)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.read ? 'transparent' : 'var(--brand)', marginTop: 6 }} />
              <div>
                <div style={{ fontWeight: n.read ? 600 : 700, fontSize: 13, color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.meta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
