import { Route } from 'react-router-dom';
import RoleGuard from '../../components/RoleGuard/RoleGuard';
import { RETAIL_STAFF_ACCESS_ROLES, ADMIN_ONLY } from '../../config/permissions';
import StaffDashboard from './pages/StaffDashboard';
import StoreAnalyticsConsole from './pages/StoreAnalyticsConsole';
import RetailAdminDashboard from './pages/RetailAdminDashboard';

/**
 * Retail module route table. Consumed by `src/App.jsx` via `{retailRoutes}`
 * inside its top-level `<Routes>`. All retail role-gating lives here so the
 * shared app shell has no retail-specific routing logic.
 */
export const retailRoutes = [
    <Route
        key="retail-staff"
        path="/retail-staff"
        element={
            <RoleGuard roles={RETAIL_STAFF_ACCESS_ROLES}>
                <StaffDashboard />
            </RoleGuard>
        }
    />,
    <Route
        key="retail-staff-analytics-console"
        path="/retail-staff/analytics-console"
        element={
            <RoleGuard roles={RETAIL_STAFF_ACCESS_ROLES}>
                <StoreAnalyticsConsole />
            </RoleGuard>
        }
    />,
    <Route
        key="retail-admin"
        path="/retail-admin"
        element={
            <RoleGuard roles={ADMIN_ONLY}>
                <RetailAdminDashboard />
            </RoleGuard>
        }
    />,
];
