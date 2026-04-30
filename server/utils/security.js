import crypto from 'crypto';

export const VALID_ROLES = ['admin', 'staff'];

export function normalizeEmail(email) {
    return String(email || '').toLowerCase().trim();
}

export function normalizeRole(role) {
    return VALID_ROLES.includes(role) ? role : 'staff';
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
