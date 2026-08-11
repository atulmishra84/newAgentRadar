import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { agentsAPI, policiesAPI, activityAPI, modelsAPI, approvalsAPI, playbooksAPI, configAPI, adminAPI, notificationsAPI } from '../lib/api'

const DEF = {
  agents: [],
  risks: [
    { id:1,name:'GPT-4 Hub - unrestricted PII',level:'critical',cat:'Data Exposure',desc:'No DPA. Live PII access without audit trail.',aid:1 },
    { id:2,name:'AutoGPT - prod API keys',level:'critical',cat:'Credential Risk',desc:'Prod API keys on unmanaged workstation.',aid:12 },
    { id:3,name:'Shadow Crawler - internal scan',level:'critical',cat:'Unauthorized Access',desc:'Bot scanning internal network and databases.',aid:5 },
    { id:4,name:'Unknown ML - blocked egress',level:'critical',cat:'Data Exfiltration',desc:'Blocked egress attempts to external IPs.',aid:9 },
    { id:5,name:'Shadow HL7 Listener - PHI on port 2575',level:'critical',cat:'PHI Exposure',desc:'Unauthorized HL7 MLLP listener receiving live ADT feeds with PHI.',aid:17 },
    { id:6,name:'LangChain - Slack exfiltration',level:'high',cat:'Data Exfiltration',desc:'Sending Slack data to external LLM without consent.',aid:3 },
    { id:7,name:'HR Screener - EU AI Act Art.22',level:'high',cat:'Regulatory',desc:'No human-in-the-loop for employment decisions.',aid:6 },
    { id:8,name:'Zapier - unauthorized OAuth',level:'high',cat:'Unauthorized Access',desc:'Email/calendar access without IT approval.',aid:10 },
    { id:9,name:'Patient Classifier - HIPAA BAA missing',level:'high',cat:'PHI Exposure',desc:'PHI access without Business Associate Agreement in place.',aid:13 },
    { id:10,name:'Genomics Agent - GDPR Art.9 violation',level:'high',cat:'Regulatory',desc:'Special category genomic data processed without explicit consent.',aid:18 },
    { id:11,name:'FinBot - NIST RMF gap',level:'medium',cat:'Compliance Gap',desc:'Impact assessments missing for autonomous trading.',aid:7 },
    { id:12,name:'ServiceDesk - GDPR lawful basis',level:'medium',cat:'Compliance Gap',desc:'No documented lawful basis for EU data.',aid:2 },
    { id:13,name:'Radiology Pipeline - FDA SaMD unclassified',level:'medium',cat:'Regulatory',desc:'Multi-agent diagnostic system not yet classified under FDA SaMD.',aid:14 },
  ],
  models: [],
  policies: [],
  approvals: [],
  apprHist: [],
  playbooks: [],
  notifications: [],
  activity: [],
  tenants: [
    { n:'Healthcare Global Global',c:'#10b981' },
    { n:'Healthcare Global APAC',c:'#3b82f6' },
    { n:'Healthcare Global EU',c:'#8b5cf6' },
  ],
  ct: 0,
  lastScan: null,
  user: null,
  isLoggedIn: false,
  currentView: 'dashboard',
  typeFilter: 'all',
  envFilter: 'all',
  riskFilter: 'all',
  drawerAgentId: null,
  drawerOpen: false,
  aiPanelOpen: false,
  modalOpen: null,
  onboardingOpen: false,
  sessionWarnVisible: false,
  hasLLM: false,
  configuredLLMs: [],
}

function computeViolations(agents, policies) {
  const vs = []
  agents.forEach(a => {
    policies.filter(p => p.on).forEach(p => {
      let hit = false
      if (p.cond === 'pii_no_gdpr' && a.pii && a.controls?.gdpr !== 'pass') hit = true
      if (p.cond === 'shadow_critical' && a.shadow && a.risk === 'critical') hit = true
      if (p.cond === 'unknown_proto' && a.protocols?.some(pr => pr.toLowerCase().includes('unknown'))) hit = true
      if (p.cond === 'cloud_no_soc2' && a.env === 'Cloud' && a.controls?.soc2 !== 'pass') hit = true
      if (p.cond === 'phi_no_hipaa' && a.phi && a.controls?.hipaa !== 'pass') hit = true
      if (p.cond === 'fhir_no_hipaa' && a.protocols?.some(pr => pr.includes('FHIR')) && a.controls?.hipaa !== 'pass') hit = true
      if (hit) vs.push({ agent: a, policy: p })
    })
  })
  return vs
}

const useStore = create(
  persist(
    (set, get) => ({
      ...DEF,

      login: (user) => set({ user, isLoggedIn: true }),
      logout: () => set({ user: null, isLoggedIn: false }),
      setView: (view) => set({ currentView: view }),
      setTypeFilter: (f) => set({ typeFilter: f }),
      setEnvFilter: (f) => set({ envFilter: f }),
      setRiskFilter: (f) => set({ riskFilter: f }),
      openDrawer: (agentId) => set({ drawerOpen: true, drawerAgentId: agentId }),
      closeDrawer: () => set({ drawerOpen: false, drawerAgentId: null }),
      openAIPanel: () => {
        if (get().configuredLLMs.length > 0 || get().hasLLM) {
          set({ aiPanelOpen: true })
        } else {
          set({ modalOpen: 'missing-llm' })
        }
      },
      closeAIPanel: () => set({ aiPanelOpen: false }),
      openModal: (name) => set({ modalOpen: name }),
      closeModal: () => set({ modalOpen: null }),
      openOnboarding: () => set({ onboardingOpen: true }),
      closeOnboarding: () => set({ onboardingOpen: false }),
      showSessionWarn: () => set({ sessionWarnVisible: true }),
      hideSessionWarn: () => set({ sessionWarnVisible: false }),
      addAgent: (agent) => set(state => {
        const newId = (state.agents.length > 0 ? Math.max(...state.agents.map(a => a.id)) : 0) + 1
        const newAgent = { ...agent, id: newId, firstDetected: new Date().toISOString() }
        return { agents: [...state.agents, newAgent] }
      }),
      updateAgent: (id, updates) => set(state => ({
        agents: state.agents.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      removeAgent: (id) => set(state => ({
        agents: state.agents.filter(a => a.id !== id)
      })),
      quarantine: (id) => set(state => ({
        agents: state.agents.map(a => a.id === id ? { ...a, risk: 'low', lastSeen: 'Quarantined' } : a),
        activity: [
          { type: 'alert', t: `Quarantined: ${state.agents.find(a => a.id === id)?.name || 'Agent'}`, m: 'Admin � just now', c: '#ef4444' },
          ...state.activity,
        ]
      })),
      addPolicy: (policy) => set(state => ({
        policies: [...state.policies, { ...policy, on: policy.on ?? true }]
      })),
      togglePolicy: async (id) => {
        const policy = get().policies.find(p => p.id === id)
        if (!policy) return
        const targetOn = !policy.on
        set(state => ({
          policies: state.policies.map(p => p.id === id ? { ...p, on: targetOn } : p)
        }))
        try {
          await policiesAPI.update(id, targetOn)
        } catch(e) {
          console.error('Failed to toggle policy:', e)
          set(state => ({
            policies: state.policies.map(p => p.id === id ? { ...p, on: !targetOn } : p)
          }))
        }
      },
      approveAgent: async (approvalId) => {
        try {
          const res = await approvalsAPI.approve(approvalId)
          set(state => ({
            approvals: state.approvals.map(a => a.id === approvalId ? res.data : a)
          }))
        } catch(e) {
          console.error('Failed to approve:', e)
        }
      },
      rejectAgent: async (approvalId) => {
        try {
          const res = await approvalsAPI.reject(approvalId)
          set(state => ({
            approvals: state.approvals.map(a => a.id === approvalId ? res.data : a)
          }))
        } catch(e) {
          console.error('Failed to reject:', e)
        }
      },
      markNotifRead: async (id) => {
        try {
          await notificationsAPI.markRead(id);
          set(state => ({
            notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
          }));
        } catch (e) {
          console.error('Failed to mark notification as read:', e);
        }
      },
      markAllRead: async () => {
        try {
          await notificationsAPI.markAllRead();
          set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true }))
          }));
        } catch (e) {
          console.error('Failed to mark all notifications as read:', e);
        }
      },
      addNotification: (notif) => set(state => ({
        notifications: [{ ...notif, id: Date.now(), read: false }, ...state.notifications]
      })),
      addActivity: (act) => set(state => ({
        activity: [act, ...state.activity].slice(0, 50)
      })),
      setLastScan: (ts) => set({ lastScan: ts }),
      fetchNotifications: async () => {
        try {
          const res = await notificationsAPI.list();
          set({ notifications: res.data || [] });
        } catch (e) {
          console.error('Failed to fetch notifications:', e);
        }
      },
      fetchAgents: async () => {
        try {
          const res = await agentsAPI.list()
          set({ agents: res.data })
        } catch (e) {
          console.error('Failed to fetch agents:', e)
        }
      },
      fetchPolicies: async () => {
        try {
          const res = await policiesAPI.list()
          set({ policies: res.data })
        } catch (e) {
          console.error('Failed to fetch policies:', e)
        }
      },
      fetchActivity: async () => {
        try {
          const res = await activityAPI.list()
          set({ activity: res.data })
        } catch (err) {
          console.error('Failed to fetch activity:', err)
        }
      },
      fetchConfig: async () => {
        try {
          const res = await configAPI.get()
          let configuredLLMs = Array.isArray(res.data.configuredLLMs) ? res.data.configuredLLMs : []

          if (!configuredLLMs.length && res.data.hasLLM) {
            try {
              const keysRes = await adminAPI.getAIKeys()
              configuredLLMs = Object.entries(keysRes.data || {})
                .filter(([, value]) => value && value.configured)
                .map(([provider]) => provider)
            } catch (fallbackErr) {
              console.error('Failed to fetch AI keys fallback:', fallbackErr)
            }
          }

          set({
            hasLLM: !!res.data.hasLLM,
            configuredLLMs,
          })
        } catch (err) {
          console.error('Failed to fetch config:', err)
        }
      },
      fetchModels: async () => {
        try {
          const res = await modelsAPI.list()
          set({ models: res.data || [] })
        } catch (e) {
          console.error('Failed to fetch models:', e)
        }
      },
      fetchApprovals: async () => {
        try {
          const res = await approvalsAPI.list()
          set({ approvals: res.data || [] })
        } catch (e) {
          console.error('Failed to fetch approvals:', e)
        }
      },
      fetchPlaybooks: async () => {
        try {
          const res = await playbooksAPI.list()
          set({ playbooks: res.data || [] })
        } catch (e) {
          console.error('Failed to fetch playbooks:', e)
        }
      },
      executePlaybook: async (id, agentId, title) => {
        try {
          await playbooksAPI.execute(id, agentId, 'Manual execution via UI')
          get().addActivity({ type: 'reg', t: `Playbook executed: ${title}`, m: 'Security Team � just now', c: 'var(--brand)' })
        } catch (e) {
          console.error('Failed to execute playbook:', e)
        }
      },
      triggerScan: async () => {
        try {
          const res = await agentsAPI.scan()
          if (res.data.agents) set({ agents: res.data.agents })
          set({ lastScan: new Date().toISOString() })
          get().addActivity({ type: 'scan', t: 'Full API scan completed', m: 'System � just now', c: '#10b981' })
        } catch (e) {
          console.error('Scan failed:', e)
        }
      },
      getViolations: () => computeViolations(get().agents, get().policies),
      getAgentById: (id) => get().agents.find(a => a.id === id),
      getStats: () => {
        const A = get().agents
        const violations = computeViolations(A, get().policies)
        return {
          total: A.length,
          shadow: A.filter(a => a.shadow).length,
          critical: A.filter(a => a.risk === 'critical').length,
          high: A.filter(a => a.risk === 'high').length,
          compliant: A.filter(a => {
            const vals = Object.values(a.controls || {})
            return vals.length > 0 && vals.every(v => v === 'pass')
          }).length,
          violations: violations.length,
          phi: A.filter(a => a.phi).length,
          pendingApprovals: get().approvals.filter(a => a.stage === 'pending').length,
          unreadNotifs: get().notifications.filter(n => !n.read).length,
        }
      },
    }),
    {
      name: 'arLaunch_v2',
      partialize: (s) => ({
        agents: s.agents,
        risks: s.risks,
        models: s.models,
        policies: s.policies,
        approvals: s.approvals,
        apprHist: s.apprHist,
        playbooks: s.playbooks,
        notifications: s.notifications,
        activity: s.activity,
        tenants: s.tenants,
        lastScan: s.lastScan,
        ct: s.ct,
        user: s.user,
        isLoggedIn: s.isLoggedIn,
        hasLLM: s.hasLLM,
        configuredLLMs: s.configuredLLMs,
      }),
    }
  )
)

export default useStore
