import crypto from 'crypto';

export const VALID_ROLES = ['admin', 'staff', 'viewer', 'feedback', 'executive', 'team_lead'];

export function normalizeEmail(email) {
    return String(email || '').toLowerCase().trim();
}

/**
 * Map CSV / UI labels (e.g. "Team Lead", "Executive (ISD NM only)") to a VALID_ROLES slug, or null.
 */
export function resolveRoleToValidSlug(role) {
    if (role == null) return null;
    let r = String(role).trim().toLowerCase();
    if (!r) return null;

    r = r.split('(')[0].trim();
    if (!r) return null;

    r = r.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!r) return null;

    const underscored = r.replace(/ /g, '_');
    return VALID_ROLES.includes(underscored) ? underscored : null;
}

export function normalizeRole(role) {
    return resolveRoleToValidSlug(role) ?? 'staff';
}

export function createRawToken() {
    return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function getAllowedDomains() {
    return (process.env.ALLOWED_EMAIL_DOMAINS || 'myfrido.com')
        .split(',')
        .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);
}

export function isAllowedCompanyEmail(email) {
    const normalized = normalizeEmail(email);
    const domain = normalized.split('@')[1];
    return Boolean(domain) && getAllowedDomains().includes(domain);
}
