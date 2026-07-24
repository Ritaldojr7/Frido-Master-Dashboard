/**
 * Parse organization env vars — shared by API route and tests.
 */
import { DEFAULT_RETAIL_STRUCTURE_CONTACTS } from '../modules/retail/organization.js';

export { DEFAULT_RETAIL_STRUCTURE_CONTACTS };

export function parseCsvList(value) {
    return String(value ?? '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
}

export function parseJsonRecord(value, fallback = {}) {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

export function parseJsonArray(value, fallback = []) {
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

/**
 * Server-side allowlists.
 *
 * The `VITE_`-prefixed variants are inlined into the client bundle at build time, so they
 * are readable by anyone who opens devtools. Access control must not depend on them.
 * Prefer the unprefixed server-only variable; fall back to the `VITE_` one so existing
 * deployments keep working until the unprefixed vars are set in Render.
 */
function serverCsvList(env, serverKey, viteKey) {
    const serverValue = String(env[serverKey] ?? '').trim();
    return parseCsvList(serverValue || env[viteKey]);
}

/** Emails permitted to open the Salary Analysis static dashboard. Empty list ⇒ admins only. */
export function getSalaryAnalysisEmailsServer(env = process.env) {
    return serverCsvList(env, 'SALARY_ANALYSIS_EMAILS', 'VITE_SALARY_ANALYSIS_EMAILS');
}

/** Emails permitted to open the ISD executive static dashboards. Empty list ⇒ role check. */
export function getIsdDashboardEmailsServer(env = process.env) {
    return serverCsvList(env, 'ISD_DASHBOARD_EMAILS', 'VITE_ISD_DASHBOARD_EMAILS');
}

/**
 * Emails permitted to UPLOAD a daily inventory sheet.
 *
 * Viewing is role-based (executives and admins); uploading replaces the snapshot everyone
 * then reads, so it is restricted to named people. Empty list ⇒ admins only, never
 * "everyone" — an unconfigured allowlist must not widen write access.
 */
export function getInventoryUploaderEmailsServer(env = process.env) {
    return serverCsvList(env, 'INVENTORY_UPLOADER_EMAILS', 'VITE_INVENTORY_UPLOADER_EMAILS');
}

/** Store-manager email → store name. Empty map ⇒ role check. */
export function getStoreEmailMapServer(env = process.env) {
    const serverValue = String(env.STORE_EMAIL_MAP ?? '').trim();
    return normalizeEmailRecord(
        parseJsonRecord(serverValue || env.VITE_STORE_EMAIL_MAP, {})
    );
}

export const DEFAULT_STAFF_ESCALATION_CONTACTS = [
    { name: 'Arsh', pocFor: 'Tech', email: 'arsh.a@myfrido.com', phone: '+917028154267' },
    { name: 'Juned', pocFor: 'MIS', email: 'juned.m@myfrido.com', phone: '+917498931102' },
    { name: 'Nishrit', pocFor: 'Overall', email: 'nishrit.p@myfrido.com', phone: '+917051780171' },
    { name: 'Saiyed Abdal', pocFor: 'Highest Escalations', email: 'saiyed.a@myfrido.com', phone: '+917987962503' },
];

export function loadOrganizationConfigFromEnv(env = process.env) {
    return {
        isdDashboardEmails: parseCsvList(env.VITE_ISD_DASHBOARD_EMAILS),
        salaryAnalysisEmails: parseCsvList(env.VITE_SALARY_ANALYSIS_EMAILS),
        storeEmailMap: normalizeEmailRecord(parseJsonRecord(env.VITE_STORE_EMAIL_MAP, {})),
        homePathByEmail: normalizeHomePaths(parseJsonRecord(env.VITE_HOME_PATH_BY_EMAIL, {})),
        supportContactEmail:
            String(env.VITE_SUPPORT_CONTACT_EMAIL ?? 'support@myfrido.com').trim() ||
            'support@myfrido.com',
        staffEscalationContacts: parseJsonArray(env.VITE_STAFF_ESCALATION_CONTACTS, DEFAULT_STAFF_ESCALATION_CONTACTS),
        retailStructureContacts: parseJsonArray(env.VITE_RETAIL_STRUCTURE_CONTACTS, DEFAULT_RETAIL_STRUCTURE_CONTACTS),
    };
}
