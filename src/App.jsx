import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import AuthGate from './components/AuthGate/AuthGate';
import RoleGuard from './components/RoleGuard/RoleGuard';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import InsideSalesIndia from './pages/InsideSalesIndia';
import InsideSalesMiddleEast from './pages/InsideSalesMiddleEast';
import ExperienceStore from './pages/ExperienceStore';
import RetentionCalling from './pages/RetentionCalling';
import OnlineReputationManagement from './pages/OnlineReputationManagement';
import FeedbackCustomerExperience from './pages/FeedbackCustomerExperience';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { ALL_ROLES, MANAGER_AND_ABOVE, ADMIN_ONLY } from './config/permissions';

// Use HashRouter for GitHub Pages (no server-side routing), BrowserRouter otherwise
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const Router = DEMO_MODE ? HashRouter : BrowserRouter;

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={
                  <RoleGuard roles={ALL_ROLES}><Dashboard /></RoleGuard>
                } />
                <Route path="/inside-sales-india" element={
                  <RoleGuard roles={MANAGER_AND_ABOVE}><InsideSalesIndia /></RoleGuard>
                } />
                <Route path="/inside-sales-middle-east" element={
                  <RoleGuard roles={MANAGER_AND_ABOVE}><InsideSalesMiddleEast /></RoleGuard>
                } />
                <Route path="/experience-store" element={
                  <RoleGuard roles={MANAGER_AND_ABOVE}><ExperienceStore /></RoleGuard>
                } />
                <Route path="/retention-calling" element={
                  <RoleGuard roles={MANAGER_AND_ABOVE}><RetentionCalling /></RoleGuard>
                } />
                <Route path="/online-reputation-management" element={
                  <RoleGuard roles={MANAGER_AND_ABOVE}><OnlineReputationManagement /></RoleGuard>
                } />
                <Route path="/feedback-customer-experience" element={
                  <RoleGuard roles={MANAGER_AND_ABOVE}><FeedbackCustomerExperience /></RoleGuard>
                } />
                <Route path="/profile" element={
                  <RoleGuard roles={ALL_ROLES}><Profile /></RoleGuard>
                } />
                <Route path="/admin" element={
                  <RoleGuard roles={ADMIN_ONLY}><Admin /></RoleGuard>
                } />
                <Route path="*" element={
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <h1 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '16px' }}>404</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Page not found</p>
                  </div>
                } />
              </Routes>
            </Layout>
          </Router>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
