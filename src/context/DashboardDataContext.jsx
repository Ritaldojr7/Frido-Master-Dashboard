/* eslint-disable react-refresh/only-export-components -- context + hooks in one module */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    isdNmData,
    staffExperienceStoreData,
} from '../config/dashboardData';
import { apiFetch, useAuth } from './AuthContext';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const STATIC = {
    isd_nm: isdNmData,
    staff_experience_store: staffExperienceStoreData,
};

const BULK_SLUGS_QUERY = 'isd_nm,staff_experience_store';

const DashboardDataContext = createContext(null);

function mergeDashboard(slugKey, remote) {
    const fromApi = remote?.[slugKey];
    if (fromApi && typeof fromApi === 'object' && Array.isArray(fromApi.sections)) {
        return fromApi;
    }
    if (!DEMO_MODE) {
        return { title: '', backRoute: '', sections: [] };
    }
    return STATIC[slugKey] || { title: '', backRoute: '', sections: [] };
}

/** @param {{ children: import('react').ReactNode }} props */
export function DashboardDataProvider({ children }) {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [remote, setRemote] = useState({});
    /** After first bootstrap (demo, signed-out idle, or post-fetch/error). */
    const [dashboardsLoaded, setDashboardsLoaded] = useState(() => DEMO_MODE);
    const [dashboardsError, setDashboardsError] = useState(null);

    const reload = useCallback(async () => {
        if (DEMO_MODE || !isAuthenticated) return;
        setDashboardsLoaded(false);
        setDashboardsError(null);
        try {
            const data = await apiFetch(
                `/api/dashboards?slugs=${encodeURIComponent(BULK_SLUGS_QUERY)}`
            );
            const next = data?.dashboards && typeof data.dashboards === 'object' ? data.dashboards : {};
            setRemote(next);
        } catch (err) {
            setRemote({});
            setDashboardsError(err?.message || 'Failed to load dashboards');
            throw err;
        } finally {
            setDashboardsLoaded(true);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (DEMO_MODE) {
                setRemote({});
                setDashboardsError(null);
                setDashboardsLoaded(true);
                return;
            }
            if (authLoading) {
                return;
            }
            if (!isAuthenticated) {
                setRemote({});
                setDashboardsError(null);
                setDashboardsLoaded(true);
                return;
            }

            setDashboardsLoaded(false);
            setDashboardsError(null);

            try {
                const data = await apiFetch(
                    `/api/dashboards?slugs=${encodeURIComponent(BULK_SLUGS_QUERY)}`
                );
                const next =
                    data?.dashboards && typeof data.dashboards === 'object' ? data.dashboards : {};
                if (!cancelled) {
                    setRemote(next);
                    setDashboardsLoaded(true);
                }
            } catch (err) {
                if (!cancelled) {
                    console.warn('[DashboardData]', err?.message || err);
                    setRemote({});
                    setDashboardsError(err?.message || 'Failed to load dashboards');
                    setDashboardsLoaded(true);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, authLoading]);

    const value = useMemo(() => {
        const staffRetail = mergeDashboard('staff_experience_store', remote);
        const isdNmDashboard = mergeDashboard('isd_nm', remote);

        return {
            staffRetail,
            /** Alias — same shape as legacy `staffExperienceStoreData`. */
            staffExperienceStore: staffRetail,
            isdNm: isdNmDashboard,
            dashboardsLoaded,
            dashboardsLoading: !dashboardsLoaded,
            dashboardsError,
            reload,
        };
    }, [remote, dashboardsLoaded, dashboardsError, reload]);

    return (
        <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>
    );
}

export function useDashboardData() {
    const ctx = useContext(DashboardDataContext);
    if (!ctx) {
        throw new Error('useDashboardData must be used within DashboardDataProvider');
    }
    return ctx;
}
