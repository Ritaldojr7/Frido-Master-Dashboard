import { createContext, useContext, useEffect, useState } from 'react';
import { applyRuntimeOrgConfig } from '../config/organizationConfig';

const OrgConfigContext = createContext({ ready: false });

export function OrgConfigProvider({ children }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (import.meta.env.VITEST === 'true') {
            setReady(true);
            return undefined;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/config/organization');
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) {
                        applyRuntimeOrgConfig(data);
                    }
                }
            } catch (err) {
                console.warn('[OrgConfig] Failed to load runtime config:', err.message);
            } finally {
                if (!cancelled) setReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    if (!ready) {
        return null;
    }

    return (
        <OrgConfigContext.Provider value={{ ready }}>
            {children}
        </OrgConfigContext.Provider>
    );
}

export function useOrgConfigReady() {
    return useContext(OrgConfigContext).ready;
}
