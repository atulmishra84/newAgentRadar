import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'

const TYPE_COLOR = {
  source:   '#6366f1',
  transit:  '#f59e0b',
  agent:    '#8b5cf6',
  store:    '#10b981',
  external: '#ef4444',
}
const TYPE_ICON = {
  source:   '🏥',
  transit:  '🔄',
  agent:    '🤖',
  store:    '🗄️',
  external: '🌐',
}

export default function DataLineage() {
  const svgRef = useRef(null)
  const agents = useStore(s => s.agents)

  useEffect(() => {
    renderLineage()
  }, [agents])

  function renderLineage() {
    const container = svgRef.current?.parentElement
    if (!container) return
    const W = container.clientWidth || 900
    const H = container.clientHeight || 540

    // Generate Topology Dynamically
    const sources = new Map()
    const stores = new Map()
    const agentNodes = []
    const edges = []

    let sY = 0
    let aY = 0
    let storeY = 0

    agents.forEach(agent => {
      const aId = `a-${agent.id}`
      agentNodes.push({
        id: aId,
        label: agent.name || 'Unknown Agent',
        type: 'agent',
        phi: !!agent.phi,
        x: 400,
        y: 80 + aY * 100
      })
      aY++

      // Parse Protocols to generate Sources
      let protos = agent.protocols || []
      if (typeof protos === 'string') {
        try { protos = JSON.parse(protos) } catch(e) { protos = [] }
      }
      
      if (!protos.length) protos = ['REST API'] // default

      protos.forEach(proto => {
        const p = proto.toLowerCase()
        let sourceName = 'Internal Service'
        let sourceType = 'source'
        if (p.includes('hl7') || p.includes('mllp')) sourceName = 'EHR / HL7 Stream'
        else if (p.includes('fhir')) sourceName = 'FHIR Gateway'
        else if (p.includes('dicom')) sourceName = 'PACS Source'
        else if (p.includes('sql') || p.includes('postgres')) sourceName = 'Internal Database'
        else if (p.includes('rest') || p.includes('http') || p.includes('grpc')) sourceName = 'API Gateway'
        
        if (!sources.has(sourceName)) {
           sources.set(sourceName, { 
             id: `s-${sourceName.replace(/\\s+/g, '')}`, 
             label: sourceName, 
             type: sourceType, 
             phi: p.includes('hl7') || p.includes('fhir') || p.includes('dicom'), 
             x: 80, 
             y: 100 + sY * 140 
           })
           sY++
        }
        
        // Edge Source -> Agent
        edges.push({
          from: sources.get(sourceName).id,
          to: aId,
          enc: agent.controls?.encryption === 'pass' || (!p.includes('mllp') && !p.includes('http ')),
          baa: agent.controls?.hipaa === 'pass' || !agent.phi,
          phi: agent.phi
        })
      })

      // Environment -> Stores
      const envName = agent.env || 'Local'
      if (!stores.has(envName)) {
        stores.set(envName, { 
          id: `st-${envName}`, 
          label: `${envName} Storage`, 
          type: (envName === 'Cloud' || envName === 'Azure' || envName === 'AWS') ? 'external' : 'store', 
          phi: false, 
          x: 720, 
          y: 100 + storeY * 140 
        })
        storeY++
      }
      
      // Edge Agent -> Store
      edges.push({
        from: aId,
        to: `st-${envName}`,
        enc: agent.controls?.encryption === 'pass',
        baa: agent.controls?.hipaa === 'pass' || !agent.phi,
        phi: !!agent.phi
      })
    })

    const dynNodes = [...Array.from(sources.values()), ...agentNodes, ...Array.from(stores.values())]

    // Scale nodes to fit container
    // We want the view to expand vertically if there are many agents
    const maxNodesY = Math.max(sY, aY, storeY) * 100 + 100
    const scrollH = Math.max(H, maxNodesY)
    
    const scaleX = (W - 120) / 800
    const scaleY = 1 // Vertical scaling disabled for better scrolling layout

    const nodes = dynNodes.map(n => ({
      ...n, sx: 60 + n.x * scaleX, sy: n.y
    }))
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

    let out = `<rect width="${W}" height="${scrollH}" fill="#080c12"/>`
    out += `<pattern id="ldots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r=".5" fill="rgba(255,255,255,0.04)"/></pattern>`
    out += `<rect width="${W}" height="${scrollH}" fill="url(#ldots)"/>`

    // Draw edges
    edges.forEach(edge => {
      const s = nodeMap[edge.from], t = nodeMap[edge.to]
      if (!s || !t) return
      const phi = s.phi || t.phi
      const c = !edge.enc ? '#ef4444' : !edge.baa && phi ? '#f59e0b' : '#10b981'
      const dash = !edge.enc ? '6,4' : '8,0'
      const mx = (s.sx + t.sx) / 2, my = (s.sy + t.sy) / 2 - 12

      out += `<defs><marker id="arr-${edge.from}-${edge.to}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${c}" opacity=".7"/></marker></defs>`
      out += `<line x1="${s.sx}" y1="${s.sy}" x2="${t.sx}" y2="${t.sy}" stroke="${c}" stroke-width="1.5" stroke-dasharray="${dash}" opacity=".65" marker-end="url(#arr-${edge.from}-${edge.to})"/>`

      // PHI warning label on unencrypted PHI flows
      if (phi && (!edge.enc || !edge.baa)) {
        const label = !edge.enc ? 'UNENCRYPTED' : 'NO BAA'
        out += `<rect x="${mx - 24}" y="${my - 7}" width="48" height="14" rx="7" fill="${c}" opacity=".18"/>`
        out += `<text x="${mx}" y="${my + 3}" text-anchor="middle" font-size="7" fill="${c}" font-weight="700" font-family="Plus Jakarta Sans,sans-serif">${label}</text>`
      }
    })

    // Draw nodes
    nodes.forEach(n => {
      const col = TYPE_COLOR[n.type] || '#6b7280'
      const icon = TYPE_ICON[n.type] || '•'
      out += `<g>`
      out += `<circle cx="${n.sx}" cy="${n.sy}" r="22" fill="${col}" opacity=".1" stroke="${col}" stroke-width="${n.phi ? 2 : 1}"/>`
      if (n.phi) out += `<circle cx="${n.sx}" cy="${n.sy}" r="26" fill="none" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,3" opacity=".4"/>`
      out += `<text x="${n.sx}" y="${n.sy + 5}" text-anchor="middle" font-size="14">${icon}</text>`
      if (n.phi) {
        out += `<circle cx="${n.sx + 16}" cy="${n.sy - 16}" r="7" fill="#ef4444"/>`
        out += `<text x="${n.sx + 16}" y="${n.sy - 13}" text-anchor="middle" font-size="6" fill="white" font-weight="700">PHI</text>`
      }
      out += `<rect x="${n.sx - 34}" y="${n.sy + 26}" width="68" height="16" rx="8" fill="rgba(0,0,0,0.6)"/>`
      out += `<text x="${n.sx}" y="${n.sy + 37}" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.8)" font-family="Plus Jakarta Sans,sans-serif" font-weight="600">${n.label.substring(0, 14)}</text>`
      out += `</g>`
    })

    const svgEl = svgRef.current
    if (svgEl) {
      svgEl.setAttribute('viewBox', `0 0 ${W} ${scrollH}`)
      svgEl.style.height = `${scrollH}px`
      svgEl.innerHTML = out
    }
  }

  return (
    <div className="view-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#080c12' }}>
      {/* Top bar */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Data Lineage Map</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>PHI flow tracing across all registered systems</div>

        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 10, color: '#94a3b8' }}>
          {Object.entries(TYPE_COLOR).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ textTransform: 'capitalize' }}>{type}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 2, background: '#ef4444' }} />
            <span>Unencrypted</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 2, background: '#f59e0b', borderTop: '1px dashed' }} />
            <span>No BAA</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 16, height: 2, background: '#10b981' }} />
            <span>Compliant</span>
          </div>
        </div>
      </div>

      {/* SVG canvas */}
      <div style={{ flex: 1, position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
        <svg ref={svgRef} style={{ width: '100%', minHeight: '100%', display: 'block' }} />
      </div>
    </div>
  )
}
