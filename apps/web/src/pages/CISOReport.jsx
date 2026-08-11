import { useState, useEffect } from 'react'
import useStore from '../store/useStore'
import { cscore } from '../lib/helpers'

const FRAMEWORKS = [
  { key: 'soc2',     label: 'SOC 2 Type II' },
  { key: 'iso27001', label: 'ISO 27001' },
  { key: 'gdpr',     label: 'GDPR' },
  { key: 'nist',     label: 'NIST AI RMF' },
  { key: 'euai',     label: 'EU AI Act' },
  { key: 'hipaa',    label: 'HIPAA 🏥' },
  { key: 'hitrust',  label: 'HITRUST CSF 🏥' },
  { key: 'fda_samd', label: 'FDA SaMD 🏥' }
]

function getRecs(agents) {
  const recs = []
  if (agents.some(a => a.name.includes('HL7') && a.shadow)) {
    recs.push({ p: 'critical', t: '🏥 Block port 2575 (MLLP) — contain Shadow HL7 Listener immediately' })
  }
  if (agents.some(a => a.phi && a.controls?.hipaa !== 'pass')) {
    recs.push({ p: 'critical', t: '🏥 Suspend Patient Classifier until BAA is executed with AI vendor' })
  }
  if (agents.some(a => a.name.includes('AutoGPT'))) {
    recs.push({ p: 'critical', t: 'Terminate AutoGPT, rotate all production API keys' })
  }
  if (agents.some(a => a.shadow && a.risk === 'critical')) {
    recs.push({ p: 'critical', t: 'Quarantine critical shadow agents — forensic review required' })
  }
  recs.push({ p: 'high', t: '🏥 Initiate FDA SaMD classification for Radiology Pipeline' })
  recs.push({ p: 'high', t: 'Revoke external OAuth tokens pending IT security review' })
  recs.push({ p: 'medium', t: 'Complete NIST RMF documentation for financial agents' })
  
  // Return top 8 unique recs
  return Array.from(new Set(recs.map(r => r.t))).map(t => recs.find(r => r.t === t)).slice(0, 8)
}

function RTag({ level }) {
  const colors = {
    critical: { bg: 'var(--red-bg)', text: 'var(--red-text)' },
    high:     { bg: 'var(--amber-bg)', text: 'var(--amber-text)' },
    medium:   { bg: '#fef08a', text: '#b45309' }, // yellow
    low:      { bg: 'var(--green-bg)', text: 'var(--green-text)' }
  }
  const c = colors[level] || colors.medium
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      padding: '2px 6px', borderRadius: 4, background: c.bg, color: c.text
    }}>
      {level}
    </span>
  )
}

export default function CISOReport() {
  const agents = useStore(s => s.agents)
  const policies = useStore(s => s.policies)

  const [aiText, setAiText] = useState('')
  const [typing, setTyping] = useState(true)
  const [regenKey, setRegenKey] = useState(0) // Used to trigger regeneration

  // Calculations
  const total = agents.length
  const shadowCount = agents.filter(a => a.shadow).length
  const criticalCount = agents.filter(a => a.risk === 'critical').length
  const avgComp = total === 0 ? 0 : Math.round(agents.reduce((a, x) => a + cscore(x.controls), 0) / total)
  
  const phiAgents = agents.filter(a => a.phi).length
  const phiNoBaa = agents.filter(a => a.phi && a.controls?.hipaa !== 'pass').length
  const activeViolations = policies.filter(p => p.on).length // simplified for mock
  
  // Risk posture (0-100)
  const postureNum = total === 0 ? 0 : Math.min(100, Math.round((criticalCount * 25 + shadowCount * 10) / total * 100))
  const postureColor = postureNum >= 70 ? '#dc2626' : postureNum >= 40 ? '#d97706' : '#059669'
  const postureStroke = postureNum >= 70 ? 'var(--red)' : postureNum >= 40 ? 'var(--amber)' : 'var(--green)'
  const postureDashoffset = 339 - (339 * postureNum / 100)

  // Top alerts
  const alerts = []
  if (agents.some(a => a.name.includes('HL7') && a.shadow)) {
    alerts.push({ t: 'red', i: '⚠', title: '🏥 CRITICAL: Shadow HL7 Listener receiving PHI on port 2575', body: 'Unauthorized MLLP listener detected ingesting live ADT feeds. Immediate containment required.' })
  }
  if (phiNoBaa > 0) {
    alerts.push({ t: 'red', i: '⚠', title: '🏥 Agents accessing PHI without Business Associate Agreement', body: `${phiNoBaa} agents processing patient records under HIPAA without a signed BAA. Suspend until BAA is executed.` })
  }
  if (criticalCount > 0) {
    alerts.push({ t: 'amber', i: '!', title: `${criticalCount} critical-risk agents active in production`, body: 'Immediate isolation required for all critical-risk deployments.' })
  }
  if (avgComp < 50) {
    alerts.push({ t: 'amber', i: '!', title: `Overall compliance at ${avgComp}% — Significant gaps detected`, body: 'Multiple AI deployments violate GDPR Article 9 or lack human-in-the-loop oversight.' })
  }
  if (alerts.length === 0) {
    alerts.push({ t: 'green', i: '✓', title: 'No critical alerts', body: 'Governance posture is within acceptable risk tolerance.' })
  }

  // Recommendations
  const recs = getRecs(agents)

  // AI Narration Typewriter Effect
  useEffect(() => {
    setTyping(true)
    setAiText('')
    
    const narrative = `Environment scan detected ${criticalCount} critical-risk agents across ${total} total deployments. Healthcare posture requires attention: ${phiNoBaa} of ${phiAgents} PHI-accessing agents lack valid Business Associate Agreements, exposing the organization to OCR enforcement risk. Average compliance posture stands at ${avgComp}% across 8 frameworks. Immediate priorities: BAA execution for healthcare classifiers, containment of shadow listeners, and FDA SaMD classification for diagnostic pipelines. (Data fetched live from Postgres DB.)`
    
    let i = 0
    const tw = setInterval(() => {
      setAiText(narrative.slice(0, i++))
      if (i > narrative.length) {
        clearInterval(tw)
        setTyping(false)
      }
    }, 15)
    
    return () => clearInterval(tw)
  }, [total, criticalCount, phiAgents, phiNoBaa, avgComp, regenKey])

  const handleDownloadPDF = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF()
      
      const margin = 15
      let y = margin

      // Title
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text('AGENTRADAR — CISO EXECUTIVE REPORT', margin, y)
      y += 8
      
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Generated: ${new Date().toISOString()}`, margin, y)
      y += 6
      doc.line(margin, y, 210 - margin, y)
      y += 8

      // Key Metrics
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text('KEY METRICS:', margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Total AI Agents: ${total}`, margin + 5, y)
      y += 5
      doc.text(`Shadow Agents: ${shadowCount}`, margin + 5, y)
      y += 5
      doc.text(`Critical Risk: ${criticalCount}`, margin + 5, y)
      y += 5
      doc.text(`Overall Risk Posture: ${postureNum}/100`, margin + 5, y)
      y += 10

      // AI Narration
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text('AI NARRATION SUMMARY:', margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      const splitText = doc.splitTextToSize(aiText || 'N/A', 180)
      doc.text(splitText, margin, y)
      y += (splitText.length * 5) + 5

      // Frameworks
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text('FRAMEWORK ADHERENCE:', margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      FRAMEWORKS.forEach(fw => {
        const passCount = agents.filter(a => a.controls?.[fw.key] === 'pass').length
        const pct = total === 0 ? 0 : Math.round(passCount / total * 100)
        doc.text(`- ${fw.label.replace(' 🏥', '')}: ${pct}% compliant`, margin + 5, y)
        y += 5
      })
      y += 5

      // Recommendations
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text('TOP RECOMMENDATIONS:', margin, y)
      y += 6
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      recs.forEach(r => {
        // Handle long recommendations
        const splitRec = doc.splitTextToSize(`- ${r.t.replace('🏥 ', '')}`, 175)
        doc.text(splitRec, margin + 5, y)
        y += (splitRec.length * 5)
        
        // Add new page if y is near bottom
        if (y > 280) {
          doc.addPage()
          y = margin
        }
      })

      // Save PDF
      doc.save(`AgentRadar-CISO-Report-${new Date().toISOString().split('T')[0]}.pdf`)
    })
  }

  const handlePushToSlack = () => {
    alert('Pushed to #security-alerts (simulated).')
  }

  const handleRegenerate = () => {
    setRegenKey(k => k + 1)
  }

  return (
    <div className="view-enter" style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      
      {/* Top Alerts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {alerts.slice(0, 4).map((a, idx) => (
          <div key={idx} style={{
            display: 'flex', gap: 14, padding: '14px 18px', borderRadius: 12,
            background: a.t === 'red' ? 'var(--red-bg)' : a.t === 'amber' ? 'var(--amber-bg)' : 'var(--green-bg)',
            border: `1px solid ${a.t === 'red' ? 'var(--red-border)' : a.t === 'amber' ? 'var(--amber-border)' : 'var(--green-border)'}`
          }}>
            <div style={{ fontSize: 24, alignSelf: 'center', color: a.t === 'red' ? 'var(--red-text)' : a.t === 'amber' ? 'var(--amber-text)' : 'var(--green-text)' }}>{a.i}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.body}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* AI Narration */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="card-title" style={{ fontSize: 14, fontWeight: 700 }}>AI-Generated Executive Summary</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: 'var(--brand-bg)', color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✦ AI Narration</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: 99, background: 'var(--brand)', boxShadow: '0 0 10px var(--brand)' }} className={typing ? 'pulse' : ''} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AgentRadar Intelligence</span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', minHeight: 120 }}>
                {aiText}
                {typing && <span style={{ opacity: 0.5 }}>|</span>}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)', padding: '16px 20px' }}>
              <span className="card-title" style={{ fontSize: 14, fontWeight: 700 }}>Recommended Actions</span>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recs.map((r, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <RTag level={r.p} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Posture Score */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)', padding: '16px 20px' }}>
              <span className="card-title" style={{ fontSize: 14, fontWeight: 700 }}>Risk Posture Score</span>
            </div>
            <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 130, height: 130 }}>
                <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(200,210,240,0.2)" strokeWidth="10"/>
                  <circle 
                    cx="65" cy="65" r="54" fill="none" stroke={postureStroke} strokeWidth="10" 
                    strokeLinecap="round" strokeDasharray="339" strokeDashoffset={postureDashoffset}
                    style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: postureColor }}>
                  {postureNum}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 16 }}>/ 100 — higher is riskier</div>
            </div>
          </div>

          {/* Frameworks */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)', padding: '16px 20px' }}>
              <span className="card-title" style={{ fontSize: 14, fontWeight: 700 }}>Framework Adherence</span>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FRAMEWORKS.map(fw => {
                const passCount = agents.filter(a => a.controls?.[fw.key] === 'pass').length
                const pct = total === 0 ? 0 : Math.round(passCount / total * 100)
                const color = pct >= 70 ? 'var(--green-text)' : pct >= 40 ? 'var(--amber-text)' : 'var(--red-text)'
                return (
                  <div key={fw.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border-dim)', paddingBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{fw.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: '1px solid var(--glass-border-dim)', padding: '16px 20px' }}>
              <span className="card-title" style={{ fontSize: 14, fontWeight: 700 }}>Actions</span>
            </div>
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn outline" style={{ justifyContent: 'center' }} onClick={handleDownloadPDF}>
                ↓ Download PDF
              </button>
              <button className="btn outline" style={{ justifyContent: 'center' }} onClick={handlePushToSlack}>
                → Push to Slack
              </button>
              <button className="btn ai" style={{ justifyContent: 'center' }} onClick={handleRegenerate}>
                ✦ Regenerate Briefing
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
