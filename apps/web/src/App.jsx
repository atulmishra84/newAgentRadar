import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import useStore from './store/useStore'
import AppShell from './components/layout/AppShell'
import LoginScreen from './components/overlays/LoginScreen'
import OnboardingWizard from './components/overlays/OnboardingWizard'
import SessionWarning from './components/overlays/SessionWarning'
import AgentDrawer from './components/overlays/AgentDrawer'
import ScanModal from './components/overlays/ScanModal'
import AddAgentModal from './components/overlays/AddAgentModal'
import AddPolicyModal from './components/overlays/AddPolicyModal'
import AIAgentPanel from './components/overlays/AIAgentPanel'
import ImportModal from './components/overlays/ImportModal'
import WebhooksModal from './components/overlays/WebhooksModal'
import ShortcutsModal from './components/overlays/ShortcutsModal'
import EvidenceModal from './components/overlays/EvidenceModal'
import MissingLLMModal from './components/overlays/MissingLLMModal'

// Pages
import Dashboard from './pages/Dashboard'
import Discovery from './pages/Discovery'
import LiveDetection from './pages/LiveDetection'
import ShadowAI from './pages/ShadowAI'
import PHIExposure from './pages/PHIExposure'
import ModelRegistry from './pages/ModelRegistry'
import PolicyEngine from './pages/PolicyEngine'
import Approvals from './pages/Approvals'
import Compliance from './pages/Compliance'
import Playbooks from './pages/Playbooks'
import Risk from './pages/Risk'
import GlobalMesh from './pages/GlobalMesh'
import DataLineage from './pages/DataLineage'
import Integrations from './pages/Integrations'
import CISOReport from './pages/CISOReport'
import Benchmark from './pages/Benchmark'
import Notifications from './pages/Notifications'
import ActivityLog from './pages/ActivityLog'
import Admin from './pages/Admin'

export default function App() {
  const isLoggedIn = useStore(s => s.isLoggedIn)
  const onboardingOpen = useStore(s => s.onboardingOpen)
  const sessionWarnVisible = useStore(s => s.sessionWarnVisible)
  const drawerOpen = useStore(s => s.drawerOpen)
  const aiPanelOpen = useStore(s => s.aiPanelOpen)
  const modalOpen = useStore(s => s.modalOpen)
  const closeModal = useStore(s => s.closeModal)
  const fetchAgents = useStore(s => s.fetchAgents)
  const fetchPolicies = useStore(s => s.fetchPolicies)
  const fetchModels = useStore(s => s.fetchModels)
  const fetchApprovals = useStore(s => s.fetchApprovals)
  const fetchActivity = useStore(s => s.fetchActivity)
  const fetchConfig = useStore(s => s.fetchConfig)
  const fetchNotifications = useStore(s => s.fetchNotifications)

  // Fetch data on load
  useEffect(() => {
    if (isLoggedIn) {
      fetchConfig()
      fetchAgents()
      fetchPolicies()
      fetchModels()
      fetchApprovals()
      fetchActivity()
      fetchNotifications()
    }
  }, [isLoggedIn, fetchConfig, fetchAgents, fetchPolicies, fetchModels, fetchApprovals, fetchActivity, fetchNotifications])

  // Global API logout listener
  useEffect(() => {
    const handler = () => useStore.getState().logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isLoggedIn) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeModal()
        useStore.getState().closeDrawer()
        useStore.getState().closeAIPanel()
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        useStore.getState().openModal('shortcuts')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useStore.getState().openAIPanel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isLoggedIn, closeModal])

  if (!isLoggedIn) {
    return <LoginScreen />
  }

  return (
    <div className="mesh-bg" style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Main App Shell with routing */}
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/discovery/all" element={<Discovery />} />
          <Route path="/discovery/live" element={<LiveDetection />} />
          <Route path="/discovery/shadow" element={<ShadowAI />} />
          <Route path="/discovery/phi" element={<PHIExposure />} />
          <Route path="/discovery/models" element={<ModelRegistry />} />
          <Route path="/governance/policy" element={<PolicyEngine />} />
          <Route path="/governance/approvals" element={<Approvals />} />
          <Route path="/governance/compliance" element={<Compliance />} />
          <Route path="/governance/playbooks" element={<Playbooks />} />
          <Route path="/intelligence/risk" element={<Risk />} />
          <Route path="/intelligence/mesh" element={<GlobalMesh />} />
          <Route path="/intelligence/lineage" element={<DataLineage />} />
          <Route path="/integrations/connect" element={<Integrations />} />
          <Route path="/reports/ciso" element={<CISOReport />} />
          <Route path="/reports/benchmark" element={<Benchmark />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/ops/activity" element={<ActivityLog />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>

      {/* Global overlays */}
      {onboardingOpen && <OnboardingWizard />}
      {sessionWarnVisible && <SessionWarning />}
      {drawerOpen && <AgentDrawer />}
      {aiPanelOpen && <AIAgentPanel />}
      {modalOpen === 'scan' && <ScanModal />}
      {modalOpen === 'add-agent' && <AddAgentModal />}
      {modalOpen === 'add-policy' && <AddPolicyModal />}
      {modalOpen === 'import' && <ImportModal />}
      {modalOpen === 'webhooks' && <WebhooksModal />}
      {modalOpen === 'shortcuts' && <ShortcutsModal />}
      {modalOpen === 'evidence' && <EvidenceModal />}
      {modalOpen === 'missing-llm' && <MissingLLMModal />}
    </div>
  )
}

