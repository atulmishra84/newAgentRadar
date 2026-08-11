import useStore from '../../store/useStore'

export default function ShortcutsModal() {
  const closeModal = useStore(s => s.closeModal)

  return (
    <div className="modal show" id="shortcuts-panel" onClick={closeModal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="shortcuts-box" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border-dim)', borderRadius: 12, padding: 24, width: 400, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Keyboard shortcuts</div>
          <button className="btn sm" onClick={closeModal}>✕</button>
        </div>
        
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>G</kbd> <kbd>D</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Go to Agent Discovery</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>G</kbd> <kbd>S</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Go to Shadow AI</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>G</kbd> <kbd>C</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Go to Compliance</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>G</kbd> <kbd>L</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Go to Data Lineage</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>G</kbd> <kbd>R</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Go to CISO Report</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>G</kbd> <kbd>I</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Go to Connect Hub</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>/</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Focus agent search</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>⌘</kbd> <kbd>K</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Open AI Agent panel</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>Q</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quarantine all selected</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>N</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Register new agent</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>⌘</kbd> <kbd>E</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Export evidence package</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>Esc</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Close modal / panel</div></div>
        <div className="shortcut-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><div className="shortcut-keys"><kbd>?</kbd></div><div className="shortcut-desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Show this panel</div></div>
      </div>
    </div>
  )
}
