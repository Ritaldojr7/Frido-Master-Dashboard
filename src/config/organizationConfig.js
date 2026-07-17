/**
 * Organization-specific config — build-time defaults with optional runtime override
 * from GET /api/config/organization (Render env changes without rebuild).
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

const buildTimeConfig = {
    isdDashboardEmails: parseCsvList(readEnv('VITE_ISD_DASHBOARD_EMAILS')),
    salaryAnalysisEmails: parseCsvList(readEnv('VITE_SALARY_ANALYSIS_EMAILS')),
    storeEmailMap: normalizeEmailRecord(parseJsonRecord(readEnv('VITE_STORE_EMAIL_MAP'), {})),
    homePathByEmail: normalizeHomePaths(parseJsonRecord(readEnv('VITE_HOME_PATH_BY_EMAIL'), {})),
    supportContactEmail:
        String(readEnv('VITE_SUPPORT_CONTACT_EMAIL') ?? 'support@myfrido.com').trim() ||
        'support@myfrido.com',
    demoUserEmail: String(readEnv('VITE_DEMO_USER_EMAIL') ?? 'demo@myfrido.com').trim() || 'demo@myfrido.com',
    demoUserName: String(readEnv('VITE_DEMO_USER_NAME') ?? 'Demo User').trim() || 'Demo User',
    staffEscalationContacts: parseJsonArray(readEnv('VITE_STAFF_ESCALATION_CONTACTS'), []),
    retailStructureContacts: parseJsonArray(readEnv('VITE_RETAIL_STRUCTURE_CONTACTS'), []),
};

let runtimeConfig = null;

export function applyRuntimeOrgConfig(config) {
    runtimeConfig = config && typeof config === 'object' ? config : null;
}

function pick(key) {
    const runtimeValue = runtimeConfig?.[key];
    if (Array.isArray(runtimeValue)) return runtimeValue;
    if (runtimeValue && typeof runtimeValue === 'object') return runtimeValue;
    if (typeof runtimeValue === 'string' && runtimeValue) return runtimeValue;
    return buildTimeConfig[key];
}

export function getIsdDashboardEmails() {
    return pick('isdDashboardEmails');
}

export function getSalaryAnalysisEmails() {
    return pick('salaryAnalysisEmails');
}

export function getStoreEmailMap() {
    return pick('storeEmailMap');
}

export function getHomePathByEmail() {
    return pick('homePathByEmail');
}

export function getSupportContactEmail() {
    return pick('supportContactEmail');
}

export function getDemoUserEmail() {
    return pick('demoUserEmail');
}

export function getDemoUserName() {
    return pick('demoUserName');
}

export function getStaffEscalationContacts() {
    return pick('staffEscalationContacts');
}

export function getRetailStructureContacts() {
    return pick('retailStructureContacts');
}

/** @deprecated Use getIsdDashboardEmails() — kept for gradual migration */
export const ISD_DASHBOARD_EMAILS = buildTimeConfig.isdDashboardEmails;
/** @deprecated Use getSalaryAnalysisEmails() */
export const SALARY_ANALYSIS_EMAILS = buildTimeConfig.salaryAnalysisEmails;
/** @deprecated Use getStoreEmailMap() */
export const STORE_EMAIL_MAP = buildTimeConfig.storeEmailMap;
/** @deprecated Use getHomePathByEmail() */
export const HOME_PATH_BY_EMAIL = buildTimeConfig.homePathByEmail;
export const SUPPORT_CONTACT_EMAIL = buildTimeConfig.supportContactEmail;
export const DEMO_USER_EMAIL = buildTimeConfig.demoUserEmail;
export const DEMO_USER_NAME = buildTimeConfig.demoUserName;
export const STAFF_ESCALATION_CONTACTS = buildTimeConfig.staffEscalationContacts;
export const RETAIL_STRUCTURE_CONTACTS = buildTimeConfig.retailStructureContacts;
