import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate/AuthGate';
import RoleGuard from './components/RoleGuard/RoleGuard';
import NoticeProvider from './components/NoticeProvider/NoticeProvider';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import StaffDashboard from './pages/StaffDashboard';
import RetailAdminDashboard from './pages/RetailAdminDashboard';
import IsdNmDashboard from './pages/IsdNmDashboard';
import FeedbackDepartment from './pages/FeedbackDepartment';
import {
    RETAIL_STAFF_ACCESS_ROLES,
    ADMIN_ONLY,
    FEEDBACK_DEPARTMENT_ROLES,
    PROFILE_ROLES,
    ISD_NM_ROLES,
} from './config/permissions';
import { businessAnalyticsCategories } from './config/dashboardData';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const Router = DEMO_MODE ? HashRouter : BrowserRouter;

function HomeRedirect() {
    const { user } = useAuth();
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'feedback') return <Navigate to="/feedback-department" replace />;
    if (user?.role === 'executive' || user?.role === 'team_lead') return <Navigate to="/isd-nm" replace />;
    return <Navigate to="/retail-staff" replace />;
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AuthGate>
                    <Router>
                        <NoticeProvider>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<HomeRedirect />} />
                                    <Route
                                        path="/admin"
                                        element={
                                            <RoleGuard roles={ADMIN_ONLY}>
                                                <Admin />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/retail-staff"
                                        element={
                                            <RoleGuard roles={RETAIL_STAFF_ACCESS_ROLES}>
                                                <StaffDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/retail-admin"
                                        element={
                                            <RoleGuard roles={ADMIN_ONLY}>
                                                <RetailAdminDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/business-analytics"
                                        element={
                                            <RoleGuard roles={ADMIN_ONLY}>
                                                <Dashboard
                                                    categories={businessAnalyticsCategories}
                                                    title="Business Analytics Dashboard"
                                                    subtitle="Track performance across Shopify, Experience Stores, and Inside Sales"
                                                />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/isd-nm"
                                        element={
                                            <RoleGuard roles={ISD_NM_ROLES}>
                                                <IsdNmDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/feedback-department"
                                        element={
                                            <RoleGuard roles={FEEDBACK_DEPARTMENT_ROLES}>
                                                <FeedbackDepartment />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/profile"
                                        element={
                                            <RoleGuard roles={PROFILE_ROLES}>
                                                <Profile />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="*"
                                        element={
                                            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                                                <h1 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '16px' }}>404</h1>
                                                <p style={{ color: 'var(--text-secondary)' }}>Page not found</p>
                                            </div>
                                        }
                                    />
                                </Routes>
                            </Layout>
                        </NoticeProvider>
                    </Router>
                </AuthGate>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
