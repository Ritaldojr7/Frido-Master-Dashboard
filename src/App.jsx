import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardDataProvider } from './context/DashboardDataContext';
import { OrgConfigProvider } from './context/OrgConfigContext';
import AuthGate from './components/AuthGate/AuthGate';
import RoleGuard from './components/RoleGuard/RoleGuard';
import NoticeProvider from './components/NoticeProvider/NoticeProvider';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import StaffDashboard from './pages/StaffDashboard';
import StoreAnalyticsConsole from './pages/StoreAnalyticsConsole';
import RetailAdminDashboard from './pages/RetailAdminDashboard';
import IsdNmDashboard from './pages/IsdNmDashboard';
import FeedbackDepartment from './pages/FeedbackDepartment';
import OrderDispute from './pages/OrderDispute';
import AiCallingFeedback from './pages/AiCallingFeedback';
import RetailFeedbackDashboard from './pages/RetailFeedbackDashboard';
import ExecPerformanceDashboard from './pages/ExecPerformanceDashboard';
import PerformanceProfitabilityDashboard from './pages/PerformanceProfitabilityDashboard';
import SalaryAnalysisDashboard from './pages/SalaryAnalysisDashboard';
import OrmDashboard from './pages/OrmDashboard';
import LmsDashboard from './pages/LmsDashboard';
import ManpowerDashboard from './pages/ManpowerDashboard';
import {
    ADMIN_ONLY,
    AI_CALLING_FEEDBACK_ROLES,
    BUSINESS_ANALYTICS_ROLES,
    FEEDBACK_DEPARTMENT_ROLES,
    ISD_NM_ROLES,
    ISD_EXEC_PERF_ROLES,
    ISD_PROFITABILITY_ROLES,
    ORM_ROLES,
    ORDER_DISPUTE_ROLES,
    PROFILE_ROLES,
    RETAIL_STAFF_ACCESS_ROLES,
    ISD_DASHBOARD_EMAILS,
    SALARY_ANALYSIS_EMAILS,
    MANPOWER_ROLES,
    defaultHomePath,
} from './config/permissions';
import { businessAnalyticsCategories } from './config/dashboardData';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const Router = DEMO_MODE ? HashRouter : BrowserRouter;

function HomeRedirect() {
    const { user } = useAuth();
    return <Navigate to={defaultHomePath(user)} replace />;
}

function App() {
    const isdDashboardEmails = ISD_DASHBOARD_EMAILS();
    const salaryAnalysisEmails = SALARY_ANALYSIS_EMAILS();

    return (
        <ThemeProvider>
            <AuthProvider>
                <OrgConfigProvider>
                <AuthGate>
                    <Router>
                        <DashboardDataProvider>
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
                                        path="/retail-staff/analytics-console"
                                        element={
                                            <RoleGuard roles={RETAIL_STAFF_ACCESS_ROLES}>
                                                <StoreAnalyticsConsole />
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
                                            <RoleGuard roles={BUSINESS_ANALYTICS_ROLES}>
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
                                        path="/ai-calling-feedback"
                                        element={
                                            <RoleGuard roles={AI_CALLING_FEEDBACK_ROLES}>
                                                <AiCallingFeedback />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/retail-feedback"
                                        element={
                                            <RoleGuard roles={FEEDBACK_DEPARTMENT_ROLES}>
                                                <RetailFeedbackDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/order-dispute"
                                        element={
                                            <RoleGuard roles={ORDER_DISPUTE_ROLES}>
                                                <OrderDispute />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/isd/executive-performance"
                                        element={
                                            <RoleGuard roles={ISD_EXEC_PERF_ROLES} allowedEmails={isdDashboardEmails}>
                                                <ExecPerformanceDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/isd/performance-profitability"
                                        element={
                                            <RoleGuard roles={ISD_EXEC_PERF_ROLES} allowedEmails={isdDashboardEmails}>
                                                <PerformanceProfitabilityDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/isd/salary-analysis"
                                        element={
                                            <RoleGuard roles={ADMIN_ONLY} allowedEmails={salaryAnalysisEmails}>
                                                <SalaryAnalysisDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/manpower"
                                        element={
                                            <RoleGuard roles={MANPOWER_ROLES}>
                                                <ManpowerDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/orm"
                                        element={
                                            <RoleGuard roles={ORM_ROLES}>
                                                <OrmDashboard />
                                            </RoleGuard>
                                        }
                                    />
                                    <Route
                                        path="/lms-dashboard"
                                        element={
                                            <RoleGuard roles={ADMIN_ONLY}>
                                                <LmsDashboard />
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
                        </DashboardDataProvider>
                    </Router>
                </AuthGate>
                </OrgConfigProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
