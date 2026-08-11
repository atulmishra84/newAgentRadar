import { useEffect, useState } from 'react'
import useStore from '../../store/useStore'
import { adminAPI, llmAPI } from '../../lib/api'

const providerLabels = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  azure_oai: 'Azure OpenAI',
  cohere: 'Cohere',
  mistral: 'Mistral',
}

export default function AIAgentPanel() {
  const closeAIPanel = useStore(s => s.closeAIPanel)
  const configuredLLMs = useStore(s => s.configuredLLMs)
  const [availableProviders, setAvailableProviders] = useState(configuredLLMs || [])
  const [selectedProvider, setSelectedProvider] = useState((configuredLLMs || [])[0] || '')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am Radar, your AI governance assistant. I can help you analyze risks, write policies, or investigate shadow AI.' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (configuredLLMs.length > 0) {
      setAvailableProviders(configuredLLMs)
      return
    }

    let cancelled = false
    adminAPI.getAIKeys()
      .then(res => {
        if (cancelled) return
        const configured = Object.entries(res.data || {})
          .filter(([, value]) => value && value.configured)
          .map(([provider]) => provider)
        setAvailableProviders(configured)
      })
      .catch(err => {
        console.error('Failed to load configured AI providers:', err)
      })

    return () => {
      cancelled = true
    }
  }, [configuredLLMs])

  useEffect(() => {
    if (!availableProviders.length) {
      setSelectedProvider('')
      return
    }

    if (!availableProviders.includes(selectedProvider)) {
      setSelectedProvider(availableProviders[0])
    }
  }, [availableProviders, selectedProvider])

  async function send() {
    if (!input.trim() || isTyping || !selectedProvider) return
    const userText = input.trim()
    setMessages(m => [...m, { role: 'user', text: userText }])
    setInput('')
    setIsTyping(true)
    
    try {
      const res = await llmAPI.chat(userText, 'Current Context: Radar Admin Dashboard', selectedProvider)
      setMessages(m => [...m, { role: 'assistant', text: res.data.reply }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Sorry, I am having trouble connecting to the AI service right now.' }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      <div id="ai-panel-backdrop" className="open" onClick={closeAIPanel} />
      <div id="ai-agent-panel" className="open">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(200,210,240,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20 }}>AI</div>
            <div style={{ display: 'grid', gap: 2 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Radar Assistant</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Chat through your selected provider.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="inp"
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value)}
              style={{ minWidth: 150, height: 34, paddingTop: 0, paddingBottom: 0 }}
            >
              {availableProviders.map(provider => (
                <option key={provider} value={provider}>
                  {providerLabels[provider] || provider}
                </option>
              ))}
            </select>
            <div style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={closeAIPanel}>x</div>
          </div>
        </div>
        <div style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--brand-bg)' : 'var(--bg-primary)', border: `1px solid ${m.role === 'user' ? 'var(--brand-border)' : 'var(--glass-border-dim)'}`, padding: '10px 14px', borderRadius: 8, maxWidth: '85%', fontSize: 12, color: m.role === 'user' ? 'var(--brand)' : 'var(--text-primary)', lineHeight: 1.5 }}>
              {m.text}
            </div>
          ))}
          {isTyping && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--glass-border-dim)', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              <span className="typing-dots">Radar Assistant is typing...</span>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(200,210,240,0.3)' }}>
          {!availableProviders.length ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No configured providers are available yet. Add one in Admin Settings.
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); send() }} style={{ display: 'flex', gap: 10 }}>
              <input className="inp" value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask Radar via ${providerLabels[selectedProvider] || selectedProvider}...`} style={{ flex: 1 }} disabled={isTyping} />
              <button type="submit" className="btn primary" disabled={isTyping || !selectedProvider}>Send</button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
