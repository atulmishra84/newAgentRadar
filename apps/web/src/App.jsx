import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Discovery from './pages/Discovery';
import Shadow from './pages/Shadow';
import Phi from './pages/Phi';
import Risk from './pages/Risk';
import Policy from './pages/Policy';
import Operations from './pages/Operations';
import Compliance from './pages/Compliance';
import Playbooks from './pages/Playbooks';
import Ciso from './pages/Ciso';
import Models from './pages/Models';
import Integrations from './pages/Integrations';
import Coverage from './pages/Coverage';
import Admin from './pages/Admin';
import Sso from './pages/Sso';
import Enforcement from './pages/Enforcement';
import RiskSettings from './pages/RiskSettings';

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page"><p className="muted">Loading…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="discovery" element={<Discovery />} />
        <Route path="shadow" element={<Shadow />} />
        <Route path="phi" element={<Phi />} />
        <Route path="models" element={<Models />} />
        <Route path="policy" element={<Policy />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="playbooks" element={<Playbooks />} />
        <Route path="risk" element={<Risk />} />
        <Route path="ciso" element={<Ciso />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="coverage" element={<Coverage />} />
        <Route path="operations" element={<Operations />} />
        <Route path="enforcement" element={<Enforcement />} />
        <Route path="sso" element={<Sso />} />
        <Route path="risk-settings" element={<RiskSettings />} />
        <Route path="admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
