import crypto from 'crypto';

export const VALID_ROLES = ['admin', 'staff', 'feedback', 'feedback_head', 'executive', 'team_lead', 'data_analyst', 'orm_lead', 'td_head'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
    return String(email || '').toLowerCase().trim();
}

export function isValidEmail(email) {
    const normalized = normalizeEmail(email);
    return Boolean(normalized) && EMAIL_REGEX.test(normalized);
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

/**
 * Constant-time string comparison for shared secrets.
 *
 * Both sides are hashed first so the buffers are always equal length — timingSafeEqual
 * throws on a length mismatch, and the length itself would otherwise leak.
 *
 * @param {unknown} a
 * @param {unknown} b
 */
export function timingSafeCompare(a, b) {
    if (a == null || b == null) return false;
    const left = Buffer.from(hashToken(a), 'hex');
    const right = Buffer.from(hashToken(b), 'hex');
    return crypto.timingSafeEqual(left, right);
}

/**
 * Read a shared secret from the Authorization header.
 *
 * Deliberately does NOT accept `?token=` — query strings are captured by Render's access
 * logs, intermediary proxies and browser history, which is how a long-lived shared secret
 * ends up somewhere it should never be.
 *
 * @param {import('express').Request} req
 */
export function bearerSecret(req) {
    const header = req.headers?.authorization;
    if (typeof header !== 'string' || !/^Bearer\s+/i.test(header)) return null;
    const token = header.replace(/^Bearer\s+/i, '').trim();
    return token || null;
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
