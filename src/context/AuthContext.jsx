/* eslint-disable react-refresh/only-export-components -- context + hook in one file is intentional */
import { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/react';

export const AuthContext = createContext();

/**
 * Demo mode — bypasses all backend auth when VITE_DEMO_MODE is set.
 * Used for static GitHub Pages deployment.
 */
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_USER = {
    id: 'demo-staff',
    email: 'staff@myfrido.com',
    name: 'Staff',
    role: 'staff',
    department: 'Retail',
    avatar_url: '',
    status: 'active',
};

/**
 * API helper — automatically attaches Clerk session token.
 */
let _getToken = null;

async function apiFetch(path, options = {}) {
    let token = null;
    if (_getToken) {
        try {
            token = await _getToken();
        } catch {
            // Token retrieval failed — proceed without auth header
        }
    }

    const isFormData =
        typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    let res;
    try {
        res = await fetch(path, { ...options, headers, signal: options.signal });
    } catch {
        throw new Error('Unable to connect to the server. Please check your connection.');
    }

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(
            res.ok
                ? 'Server returned an invalid response.'
                : `Server error (${res.status}). The API server may not be running.`
        );
    }

    if (!res.ok) {
        const fromBody =
            (typeof data?.error === 'string' && data.error) ||
            (typeof data?.message === 'string' && data.message);
        const trimmedText = typeof text === 'string' ? text.trim() : '';
        throw new Error(
            fromBody ||
                (trimmedText.length > 0 && trimmedText.length < 500 ? trimmedText : '') ||
                `Request failed (${res.status})`
        );
    }

    return data;
}

/** Authenticated binary download (e.g. notice PDF attachments). */
async function apiFetchBlob(path, options = {}) {
    let token = null;
    if (_getToken) {
        try {
            token = await _getToken();
        } catch {
            /* proceed without auth */
        }
    }

    const headers = {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    let res;
    try {
        res = await fetch(path, { ...options, headers, signal: options.signal });
    } catch {
        throw new Error('Unable to connect to the server. Please check your connection.');
    }

    if (!res.ok) {
        const text = await res.text();
        let message = `Download failed (${res.status})`;
        try {
            const data = text ? JSON.parse(text) : {};
            message = data.error || data.message || message;
        } catch {
            if (text && text.length < 200) message = text;
        }
        throw new Error(message);
    }

    return res.blob();
}

/** Avoid infinite spinner if /api/users/me never resolves (proxy / cold start). */
const BACKEND_ME_TIMEOUT_MS = 25_000;

export function AuthProvider({ children }) {
    if (DEMO_MODE) {
        const logout = useCallback(() => {}, []);
        const updateProfile = useCallback(async (updates) => ({ ...DEMO_USER, ...updates }), []);
        const hasRole = useCallback((...roles) => roles.length === 0 || true, []);
        const value = useMemo(
            () => ({
                user: DEMO_USER,
                isAuthenticated: true,
                isLoading: false,
                logout,
                updateProfile,
                hasRole,
                apiFetch,
            }),
            [logout, updateProfile, hasRole]
        );
        return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    }

    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

function ClerkAuthProvider({ children }) {
    // ── Clerk hooks ──────────────────────────────────────────
    const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
    const { isSignedIn, getToken, isLoaded: isAuthLoaded } = useClerkAuth();
    const { signOut } = useClerk();
    const [backendUser, setBackendUser] = useState(null);
    const [isBackendLoaded, setIsBackendLoaded] = useState(false);

    // Keep the module-level _getToken in sync so apiFetch can use it
    _getToken = getToken;

    // Fetch backend user data when signed in
    useEffect(() => {
        let isMounted = true;
        async function fetchMe() {
            if (!isSignedIn || DEMO_MODE) {
                setBackendUser(null);
                setIsBackendLoaded(true);
                return;
            }
            setIsBackendLoaded(false);
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), BACKEND_ME_TIMEOUT_MS);
            try {
                const data = await apiFetch('/api/users/me', { signal: controller.signal });
                if (isMounted) {
                    setBackendUser(data.user);
                }
            } catch (err) {
                const aborted =
                    err?.name === 'AbortError' ||
                    err?.constructor?.name === 'AbortError' ||
                    /aborted|AbortError/i.test(String(err?.message));
                if (aborted) {
                    console.error(
                        'Timed out loading profile from /api/users/me — check API health and Clerk secret key.'
                    );
                } else {
                    console.error('Failed to fetch backend user:', err);
                }
            } finally {
                clearTimeout(tid);
                if (isMounted) {
                    setIsBackendLoaded(true);
                }
            }
        }
        fetchMe();
        return () => { isMounted = false; };
    }, [isSignedIn]);

    /** Keep DB avatar_url aligned with Clerk (header uses Clerk URL; Admin user list reads DB). */
    useEffect(() => {
        if (DEMO_MODE || !isSignedIn || !isBackendLoaded || !clerkUser || !backendUser?.id) return;

        const fromClerk = String(clerkUser.imageUrl ?? '').trim();
        const fromDb = String(backendUser.avatar_url ?? '').trim();
        if (fromClerk === fromDb) return;

        let cancelled = false;
        const t = window.setTimeout(async () => {
            try {
                const data = await apiFetch('/api/users/me', {
                    method: 'PUT',
                    body: JSON.stringify({ avatar_url: fromClerk }),
                });
                if (!cancelled && data?.user) {
                    setBackendUser(data.user);
                }
            } catch {
                // Non-fatal: admin list may show initials until Clerk/DB converge.
            }
        }, 400);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [isSignedIn, isBackendLoaded, clerkUser, backendUser?.id, backendUser?.avatar_url]);

    /** Wait for Clerk session machinery; when signed in, also wait for Clerk user + backend /me. */
    const clerkReady = isAuthLoaded && (!isSignedIn || isUserLoaded);
    const isLoading = DEMO_MODE ? false : (!clerkReady || (isSignedIn && !isBackendLoaded));
    const isAuthenticated = DEMO_MODE ? true : !!isSignedIn;

    // Map Clerk user to the shape the rest of the app expects
    const user = useMemo(() => {
        if (DEMO_MODE) return DEMO_USER;
        if (!clerkUser) return null;

        const email = clerkUser.primaryEmailAddress?.emailAddress || '';
        let name = backendUser?.name || clerkUser.fullName || clerkUser.firstName;

        if (!name || name === 'User') {
            const prefix = email.split('@')[0] || '';
            const firstPart = prefix.split('.')[0] || 'User';
            name = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
        }

        return {
            id: clerkUser.id,
            email,
            name,
            role: backendUser?.role ?? clerkUser.publicMetadata?.role ?? 'staff',
            department: backendUser?.department || clerkUser.publicMetadata?.department || '',
            store_name: backendUser?.store_name || clerkUser.publicMetadata?.store_name || '',
            avatar_url: clerkUser.imageUrl || '',
            status: backendUser?.status || 'active',
        };
    }, [clerkUser, backendUser]);

    /**
     * Logout — calls Clerk signOut.
     */
    const logout = useCallback(() => {
        if (DEMO_MODE) return;
        signOut();
    }, [signOut]);

    /**
     * Update the current user's profile via backend API.
     */
    const updateProfile = useCallback(async (updates) => {
        if (DEMO_MODE) return { ...DEMO_USER, ...updates };
        const data = await apiFetch('/api/users/me', {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        if (data.user) {
            setBackendUser(data.user);
        }
        return data.user;
    }, []);

    /**
     * Check if user has one of the given roles.
     */
    const hasRole = useCallback(
        (...roles) => {
            if (DEMO_MODE) return true;
            if (!clerkUser) return false;
            const userRole = backendUser?.role ?? clerkUser.publicMetadata?.role ?? 'staff';
            return roles.includes(userRole);
        },
        [clerkUser, backendUser]
    );

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                logout,
                updateProfile,
                hasRole,
                apiFetch,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

// Export api helpers for use outside React context
export { apiFetch, apiFetchBlob };
