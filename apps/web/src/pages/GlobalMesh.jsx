import { useEffect, useRef, useState } from 'react'
import useStore from '../store/useStore'

const ENV_COLOR = {
  Cloud: '#10b981', 'On-Prem': '#6366f1', Hybrid: '#f59e0b',
  'SaaS (Hosted)': '#a855f7', Unknown: '#6b7280', General: '#3b82f6',
}

const RISK_COLOR = { critical: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' }

export default function GlobalMesh() {
  const agents = useStore(s => s.agents)
  const svgRef = useRef(null)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    renderMesh()
  }, [agents, filter])

  function renderMesh() {
    const container = svgRef.current?.parentElement
    if (!container) return
    const W = container.clientWidth || 900
    const H = container.clientHeight || 540

    let filtered = agents
    if (filter === 'shadow')   filtered = agents.filter(a => a.shadow)
    if (filter === 'phi')      filtered = agents.filter(a => a.phi)
    if (filter === 'critical') filtered = agents.filter(a => a.risk === 'critical')

    // Group by environment
    const envG = {}
    filtered.forEach(a => {
      const e = a.env || 'Unknown'
      if (!envG[e]) envG[e] = []
      envG[e].push(a)
    })
    const envList = Object.keys(envG)

    const cx = W / 2, cy = H / 2
    const rR = Math.min(W, H) * 0.30
    const cR = Math.min(W, H) * 0.12

    const ctrs = envList.map((env, i) => {
      const ang = (i / envList.length) * Math.PI * 2 - Math.PI / 2
      return { env, x: cx + rR * Math.cos(ang), y: cy + rR * Math.sin(ang), color: ENV_COLOR[env] || '#6b7280' }
    })

    const agentNodes = []
    ctrs.forEach(ctr => {
      const grp = envG[ctr.env]
      grp.forEach((a, i) => {
        const ang2 = (i / Math.max(1, grp.length)) * Math.PI * 2
        const dist = cR * 0.9 + 28 + (i % 2) * 14
        agentNodes.push({
          ...a,
          x: ctr.x + dist * Math.cos(ang2),
          y: ctr.y + dist * Math.sin(ang2),
          cx: ctr.x, cy: ctr.y, cColor: ctr.color,
        })
      })
    })

    // Build SVG
    let out = `<rect width="${W}" height="${H}" fill="#080c12"/>`
    // Grid dots
    out += `<pattern id="mg" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r=".6" fill="rgba(255,255,255,0.04)"/></pattern>`
    out += `<rect width="${W}" height="${H}" fill="url(#mg)"/>`

    // Central hub
    out += `<defs><radialGradient id="hubGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#6366f1" stop-opacity=".25"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0"/></radialGradient></defs>`
    out += `<circle cx="${cx}" cy="${cy}" r="60" fill="url(#hubGrad)"/>`
    out += `<circle cx="${cx}" cy="${cy}" r="40" fill="#0f1427" stroke="#6366f1" stroke-width="2" opacity=".8"/>`
    out += `<circle cx="${cx}" cy="${cy}" r="28" fill="#6366f1" opacity=".15"/>`
    out += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="14" fill="white" opacity=".9">📡</text>`
    out += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="Plus Jakarta Sans,sans-serif" font-weight="700">CONTROL</text>`
    out += `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="8" fill="#94a3b8" font-family="Plus Jakarta Sans,sans-serif" font-weight="700">PLANE</text>`

    if (filtered.length === 0) {
      out += `<text x="${cx}" y="${cy + 70}" text-anchor="middle" font-size="13" fill="#4b5563" font-family="Plus Jakarta Sans,sans-serif">No agents to display — run a scan first</text>`
    }

    // Environment clusters
    ctrs.forEach(ctr => {
      out += `<circle cx="${ctr.x}" cy="${ctr.y}" r="${cR}" fill="${ctr.color}" opacity=".04" stroke="${ctr.color}" stroke-width="1.5" stroke-dasharray="6,4" />`
      out += `<line x1="${cx}" y1="${cy}" x2="${ctr.x}" y2="${ctr.y}" stroke="${ctr.color}" stroke-width="1" stroke-dasharray="5,4" opacity=".25"/>`
      out += `<circle cx="${ctr.x}" cy="${ctr.y}" r="16" fill="#0f1427" stroke="${ctr.color}" stroke-width="1.5"/>`
      out += `<text x="${ctr.x}" y="${ctr.y + 4}" text-anchor="middle" font-size="10" fill="${ctr.color}" font-family="monospace">${ctr.env.slice(0, 3).toUpperCase()}</text>`
      out += `<text x="${ctr.x}" y="${ctr.y + 28}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.5)" font-family="Plus Jakarta Sans,sans-serif">${ctr.env}</text>`
    })

    // Agent edges + nodes
    agentNodes.forEach(a => {
      const rc = RISK_COLOR[a.risk] || '#6b7280'
      const isShadow = a.shadow
      out += `<line x1="${a.cx}" y1="${a.cy}" x2="${a.x}" y2="${a.y}" stroke="${rc}" stroke-width="${isShadow ? 1.5 : 1}" stroke-dasharray="${isShadow ? '4,3' : '5,4'}" opacity="${isShadow ? '.5' : '.3'}"/>`
      out += `<circle cx="${a.x}" cy="${a.y}" r="10" fill="${rc}" opacity=".15" ${isShadow ? 'stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"' : `stroke="${rc}" stroke-width="1"`}/>`
      out += `<circle cx="${a.x}" cy="${a.y}" r="5" fill="${rc}" opacity=".8"/>`
      if (a.phi) out += `<circle cx="${a.x + 8}" cy="${a.y - 8}" r="4" fill="#ef4444"/><text x="${a.x + 8}" y="${a.y - 5}" text-anchor="middle" font-size="5" fill="white">PH</text>`
      out += `<text x="${a.x}" y="${a.y + 20}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.55)" font-family="Plus Jakarta Sans,sans-serif">${(a.name || '').substring(0, 14)}</text>`
    })

    const svgEl = svgRef.current
    if (svgEl) {
      svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`)
      svgEl.innerHTML = out
    }
  }

  const stats = {
    total: agents.length,
    envs: [...new Set(agents.map(a => a.env || 'Unknown'))].length,
    shadow: agents.filter(a => a.shadow).length,
    phi: agents.filter(a => a.phi).length,
  }

  return (
    <div className="view-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#080c12' }}>
      {/* Top bar */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#94a3b8' }}>
          <span style={{ fontWeight: 700, color: 'white' }}>{stats.total}</span> agents&ensp;
          <span style={{ fontWeight: 700, color: '#10b981' }}>{stats.envs}</span> environments&ensp;
          <span style={{ fontWeight: 700, color: '#ef4444' }}>{stats.shadow}</span> shadow&ensp;
          <span style={{ fontWeight: 700, color: '#f59e0b' }}>{stats.phi}</span> PHI
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[
            { id: 'all', label: 'All agents' },
            { id: 'shadow', label: 'Shadow AI' },
            { id: 'phi', label: 'PHI only' },
            { id: 'critical', label: 'Critical risk' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
                border: `1px solid ${filter === f.id ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                background: filter === f.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: filter === f.id ? '#a5b4fc' : '#94a3b8',
                fontFamily: 'var(--font-body)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mesh SVG */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 14, fontSize: 10, color: '#94a3b8' }}>
          {Object.entries(RISK_COLOR).map(([level, color]) => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ textTransform: 'capitalize' }}>{level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
