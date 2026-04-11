import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import AuthGate from './components/AuthGate/AuthGate';
import RoleGuard from './components/RoleGuard/RoleGuard';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import StaffDashboard from './pages/StaffDashboard';
import RetailAdminDashboard from './pages/RetailAdminDashboard';
import FeedbackDepartment from './pages/FeedbackDepartment';
import { ALL_ROLES, ADMIN_ONLY } from './config/permissions';
import { businessAnalyticsCategories } from './config/dashboardData';

// Used HashRouter for GitHub Pages (no server-side routing), BrowserRouter otherwise
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const isStaffApp = import.meta.env.VITE_APP_TYPE === 'STAFF';
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
                  isStaffApp
                    ? <RoleGuard roles={ALL_ROLES}><StaffDashboard /></RoleGuard>
                    : <Navigate to="/retail-staff" replace />
                } />
                {isStaffApp && (
                  <>
                    <Route path="/retail-admin" element={
                      <RoleGuard roles={ADMIN_ONLY}><RetailAdminDashboard /></RoleGuard>
                    } />
                    <Route path="/business-analytics" element={
                      <RoleGuard roles={ADMIN_ONLY}>
                        <Dashboard
                          categories={businessAnalyticsCategories}
                          title="Business Analytics Dashboard"
                          subtitle="Track performance across Shopify, Experience Stores, and Inside Sales"
                        />
                      </RoleGuard>
                    } />
                    <Route path="/feedback-department" element={
                      <RoleGuard roles={ADMIN_ONLY}>
                        <FeedbackDepartment />
                      </RoleGuard>
                    } />
                  </>
                )}
                {!isStaffApp && (
                  <>
                    <Route path="/admin" element={
                      <RoleGuard roles={ADMIN_ONLY}><Admin /></RoleGuard>
                    } />
                    <Route path="/retail-staff" element={
                      <RoleGuard roles={ALL_ROLES}><StaffDashboard /></RoleGuard>
                    } />
                    <Route path="/retail-admin" element={
                      <RoleGuard roles={ADMIN_ONLY}><RetailAdminDashboard /></RoleGuard>
                    } />
                    <Route path="/business-analytics" element={
                      <RoleGuard roles={ADMIN_ONLY}>
                        <Dashboard
                          categories={businessAnalyticsCategories}
                          title="Business Analytics Dashboard"
                          subtitle="Track performance across Shopify, Experience Stores, and Inside Sales"
                        />
                      </RoleGuard>
                    } />
                    <Route path="/feedback-department" element={
                      <RoleGuard roles={ADMIN_ONLY}>
                        <FeedbackDepartment />
                      </RoleGuard>
                    } />
                  </>
                )}
                <Route path="/profile" element={
                  <RoleGuard roles={ALL_ROLES}><Profile /></RoleGuard>
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
