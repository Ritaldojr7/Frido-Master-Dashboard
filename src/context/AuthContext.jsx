/* eslint-disable react-refresh/only-export-components -- context + hook in one file is intentional */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

const TOKEN_KEY = 'frido-token';
const USER_KEY = 'frido-user';

/**
 * API helper — automatically attaches JWT token.
 */
async function apiFetch(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    let res;
    try {
        res = await fetch(path, { ...options, headers });
    } catch (networkErr) {
        throw new Error('Unable to connect to the server. Please check your connection.');
    }

    // Read body as text first, then try to parse as JSON.
    // This prevents "Unexpected end of JSON input" when the backend is down
    // and the proxy returns an empty or non-JSON response.
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
        throw new Error(data.error || `Request failed (${res.status})`);
    }

    return data;
}

/**
 * Demo mode — bypasses all backend auth when VITE_DEMO_MODE is set.
 * Used for static GitHub Pages deployment.
 */
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_USER = {
    id: 'demo-admin',
    email: 'admin@myfrido.com',
    name: 'Admin',
    role: 'admin',
    department: 'Technology',
    avatar_url: '',
    status: 'active',
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        if (DEMO_MODE) return DEMO_USER;
        try {
            const saved = localStorage.getItem(USER_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [isAuthenticated, setIsAuthenticated] = useState(() => DEMO_MODE || !!localStorage.getItem(TOKEN_KEY));
    const [isLoading, setIsLoading] = useState(!DEMO_MODE);

    // Restore session on mount (skipped in demo mode)
    useEffect(() => {
        if (DEMO_MODE) return;
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && !user) {
            // Validate token by fetching profile
            apiFetch('/api/users/me')
                .then(data => {
                    setUser(data.user);
                    setIsAuthenticated(true);
                })
                .catch(() => {
                    // Token invalid — clear
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    setUser(null);
                    setIsAuthenticated(false);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Login with email + password via backend API.
     */
    const login = useCallback(async (email, password) => {
        if (DEMO_MODE) { setUser(DEMO_USER); setIsAuthenticated(true); return DEMO_USER; }
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthenticated(true);
        return data.user;
    }, []);

    /**
     * Logout — no-op in demo mode.
     */
    const logout = useCallback(() => {
        if (DEMO_MODE) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    /**
     * Update the current user's profile.
     */
    const updateProfile = useCallback(async (updates) => {
        if (DEMO_MODE) { const u = { ...DEMO_USER, ...updates }; setUser(u); return u; }
        const data = await apiFetch('/api/users/me', {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
    }, []);

    /**
     * Change the current user's password.
     */
    const changePassword = useCallback(async (currentPassword, newPassword) => {
        if (DEMO_MODE) return { message: 'Demo mode — password not changed.' };
        return apiFetch('/api/users/me/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    }, []);

    /**
     * Check if user has one of the given roles.
     */
    const hasRole = useCallback(
        (...roles) => user && roles.includes(user.role),
        [user]
    );

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                login,
                logout,
                updateProfile,
                changePassword,
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

// Export apiFetch for use outside React context
export { apiFetch };
