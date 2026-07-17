/**
 * Parse organization env vars — shared by API route and tests.
 */
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

export function loadOrganizationConfigFromEnv(env = process.env) {
    return {
        isdDashboardEmails: parseCsvList(env.VITE_ISD_DASHBOARD_EMAILS),
        salaryAnalysisEmails: parseCsvList(env.VITE_SALARY_ANALYSIS_EMAILS),
        storeEmailMap: normalizeEmailRecord(parseJsonRecord(env.VITE_STORE_EMAIL_MAP, {})),
        homePathByEmail: normalizeHomePaths(parseJsonRecord(env.VITE_HOME_PATH_BY_EMAIL, {})),
        supportContactEmail:
            String(env.VITE_SUPPORT_CONTACT_EMAIL ?? 'support@myfrido.com').trim() ||
            'support@myfrido.com',
        staffEscalationContacts: parseJsonArray(env.VITE_STAFF_ESCALATION_CONTACTS, []),
        retailStructureContacts: parseJsonArray(env.VITE_RETAIL_STRUCTURE_CONTACTS, []),
    };
}
