/**
 * Organization-specific config loaded from env vars.
 * Works in Vite (import.meta.env) and Node/Express (process.env).
 */

function readEnv(key) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key] != null) {
        return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env?.[key] != null) {
        return process.env[key];
    }
    return undefined;
}

function parseCsvList(value) {
    return String(value ?? '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
}

function parseJsonRecord(value, fallback = {}) {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function parseJsonArray(value, fallback = []) {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function normalizeEmailRecord(record) {
    return Object.fromEntries(
        Object.entries(record).map(([email, label]) => [email.trim().toLowerCase(), label])
    );
}

function normalizeHomePaths(record) {
    return Object.fromEntries(
        Object.entries(record).map(([email, path]) => [email.trim().toLowerCase(), String(path).trim()])
    );
}

export const ISD_DASHBOARD_EMAILS = parseCsvList(readEnv('VITE_ISD_DASHBOARD_EMAILS'));
export const SALARY_ANALYSIS_EMAILS = parseCsvList(readEnv('VITE_SALARY_ANALYSIS_EMAILS'));
export const STORE_EMAIL_MAP = normalizeEmailRecord(
    parseJsonRecord(readEnv('VITE_STORE_EMAIL_MAP'), {})
);
export const HOME_PATH_BY_EMAIL = normalizeHomePaths(
    parseJsonRecord(readEnv('VITE_HOME_PATH_BY_EMAIL'), {})
);
export const SUPPORT_CONTACT_EMAIL =
    String(readEnv('VITE_SUPPORT_CONTACT_EMAIL') ?? 'support@myfrido.com').trim() ||
    'support@myfrido.com';
export const DEMO_USER_EMAIL =
    String(readEnv('VITE_DEMO_USER_EMAIL') ?? 'demo@myfrido.com').trim() || 'demo@myfrido.com';
export const DEMO_USER_NAME =
    String(readEnv('VITE_DEMO_USER_NAME') ?? 'Demo User').trim() || 'Demo User';
export const STAFF_ESCALATION_CONTACTS = parseJsonArray(
    readEnv('VITE_STAFF_ESCALATION_CONTACTS'),
    []
);
export const RETAIL_STRUCTURE_CONTACTS = parseJsonArray(
    readEnv('VITE_RETAIL_STRUCTURE_CONTACTS'),
    []
);
