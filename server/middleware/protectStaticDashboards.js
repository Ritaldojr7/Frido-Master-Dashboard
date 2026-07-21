/**
 * Authorize static HTML dashboards served from `dist/` (originally `public/`).
 *
 * These pages are plain HTML with no auth of their own, so this middleware is the only
 * control standing in front of them. It mirrors the policy the SPA advertises in
 * `src/config/permissions.js` — but enforced server-side, because the SPA's checks only
 * hide the React wrapper around the <iframe> and are trivially bypassed by requesting the
 * page directly.
 *
 * Requests arrive from inside an <iframe> and therefore carry the Clerk session cookie
 * rather than an `Authorization` header, which is why this uses `resolveUserFromRequest`
 * instead of `verifyToken`.
 */
import { resolveUserFromRequest } from './resolveUser.js';
import { isAllowedCompanyEmail } from '../utils/security.js';
import { getStoreEmailMapServer } from '../utils/organizationEnv.js';

export const PROTECTED_STATIC_PREFIXES = [
    '/exec-dashboard',
    '/fes-sm-dashboard',
    '/ist-console',
    '/orm-dashboard',
    '/retail-feedback',
    '/salary-analysis',
];

/**
 * Per-prefix policy. Evaluated in this order:
 *   1. `allowRoles` — roles admitted outright.
 *   2. `allowEmails` — when the list is non-empty, membership is required and roles do NOT
 *      override it (an admin off a non-empty salary allowlist is denied, matching the SPA).
 *   3. `emptyEmailsFallbackRoles` — used only when the email list is empty/unconfigured.
 *
 * A prefix with no entry here is denied. See `isAuthorizedForPrefix`.
 */
export const STATIC_DASHBOARD_POLICIES = {
    '/salary-analysis': {
        allowRoles: ['admin'],
    },
    '/exec-dashboard': {
        allowRoles: ['admin'],
    },
    '/fes-sm-dashboard': {
        // SPA (`hasAccess`) admits admins outright, then store managers by email.
        allowRoles: ['admin'],
        allowEmails: () => Object.keys(getStoreEmailMapServer()),
        emptyEmailsFallbackRoles: ['admin', 'staff'],
    },
    '/ist-console': {
        allowRoles: ['admin'],
    },
    '/orm-dashboard': {
        allowRoles: ['admin', 'orm_lead'],
    },
    '/retail-feedback': {
        allowRoles: ['admin', 'feedback_head'],
    },
};

export function isProtectedStaticPath(pathname) {
    return PROTECTED_STATIC_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

/** Longest matching prefix, so a future nested prefix cannot borrow a shorter one's policy. */
export function matchedPrefix(pathname) {
    return (
        PROTECTED_STATIC_PREFIXES.filter(
            (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
        ).sort((a, b) => b.length - a.length)[0] ?? null
    );
}

/**
 * Plain role intersection with NO admin bypass.
 *
 * `utils/roles.js#hasAnyRole` returns true for admins unconditionally. Using it here would
 * silently defeat the email allowlists, which exist precisely to keep some admins out of
 * salary data. Do not swap this for that helper.
 */
function matchesRoles(roles, allowed) {
    if (!Array.isArray(allowed) || allowed.length === 0) return false;
    return allowed.some((role) => roles.includes(role));
}

/**
 * @param {string | null} prefix
 * @param {{ email: string, roles: string[] }} user
 * @returns {boolean}
 */
export function isAuthorizedForPrefix(prefix, user) {
    const policy = STATIC_DASHBOARD_POLICIES[prefix];
    // Fail closed: a prefix added to PROTECTED_STATIC_PREFIXES without a policy is denied.
    if (!policy) return false;

    const roles = Array.isArray(user?.roles) ? user.roles : [];
    const email = String(user?.email ?? '').trim().toLowerCase();

    if (matchesRoles(roles, policy.allowRoles)) return true;

    if (typeof policy.allowEmails === 'function') {
        const emails = policy.allowEmails().map((entry) => String(entry).trim().toLowerCase());
        if (emails.length === 0) {
            return matchesRoles(roles, policy.emptyEmailsFallbackRoles);
        }
        return emails.includes(email);
    }

    return false;
}

function deny(res, status, heading, message) {
    return res
        .status(status)
        .type('html')
        .send(`<!DOCTYPE html><html><body><h1>${heading}</h1><p>${message}</p></body></html>`);
}

function unauthenticated(res) {
    return deny(
        res,
        401,
        'Authentication required',
        'Sign in to the Frido Master Dashboard to view this page.'
    );
}

/** Deliberately does not name the policy or the allowlist — no probing for membership. */
function forbidden(res) {
    return deny(
        res,
        403,
        'Access restricted',
        'You do not have permission to view this dashboard. Contact your administrator to request access.'
    );
}

export async function protectStaticDashboards(req, res, next) {
    if (!isProtectedStaticPath(req.path)) {
        return next();
    }

    if (process.env.VITE_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production') {
        return next();
    }

    const prefix = matchedPrefix(req.path);

    try {
        const user = await resolveUserFromRequest(req);

        if (!user) {
            return unauthenticated(res);
        }
        if (user.status === 'disabled') {
            return forbidden(res);
        }
        if (!isAllowedCompanyEmail(user.email)) {
            return forbidden(res);
        }
        if (!isAuthorizedForPrefix(prefix, user)) {
            console.warn(
                `[protectStaticDashboards] denied ${user.email} → ${prefix} (roles: ${user.roles.join(',')})`
            );
            return forbidden(res);
        }

        return next();
    } catch (err) {
        // Fail closed — an outage in Clerk or the DB must not open the dashboards.
        console.error('[protectStaticDashboards] authorization error:', err.message);
        return forbidden(res);
    }
}
