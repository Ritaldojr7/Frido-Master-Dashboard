/**
 * Identity resolution shared by header-authenticated API routes and cookie-authenticated
 * static dashboards.
 *
 * `verifyToken` (middleware/auth.js) only reads `Authorization: Bearer`, which works for
 * SPA fetches but not for pages loaded inside an <iframe> — those carry the Clerk session
 * cookie instead. This resolver accepts either and answers a single question: *who is this?*
 *
 * It deliberately does NOT decide whether the caller may proceed. Callers apply their own
 * policy against the returned roles/email/status so that authorization stays explicit at
 * each call site.
 */
import { createClerkClient, getAuth, verifyToken as clerkVerifyToken } from '@clerk/express';
import db from '../db.js';
import { normalizeEmail } from '../utils/security.js';
import { parseRolesFromStorage } from '../utils/roles.js';

const USER_COLUMNS = 'SELECT id, role, roles, email, status FROM users WHERE id = ?';

let cachedClerkClient = null;

/** Lazy — keeps module import cheap and avoids constructing a client in tests that never use it. */
function clerk() {
    if (!cachedClerkClient) {
        cachedClerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    }
    return cachedClerkClient;
}

/** @param {import('express').Request} req */
function bearerFrom(req) {
    const header = req.headers?.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    const token = header.slice('Bearer '.length).trim();
    return token || null;
}

/** Clerk session id from cookie first, then Bearer token. */
async function resolveClerkUserId(req) {
    try {
        const { userId } = getAuth(req);
        if (userId) return userId;
    } catch {
        /* Clerk middleware not mounted (missing keys) — fall through to Bearer. */
    }

    const token = bearerFrom(req);
    if (!token) return null;

    try {
        const payload = await clerkVerifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        return payload?.sub ?? null;
    } catch (err) {
        console.warn('[resolveUser] Bearer verification failed:', err.message);
        return null;
    }
}

/**
 * Invited users keep a placeholder row keyed by email until their first authenticated
 * request links it to a Clerk id (see middleware/auth.js). An iframe can arrive before
 * that link happens, so fall back to the Clerk profile's email rather than 403-ing a
 * legitimate user on their first visit.
 */
async function findRowByClerkEmail(clerkUserId) {
    try {
        const clerkUser = await clerk().users.getUser(clerkUserId);
        const email = normalizeEmail(clerkUser.emailAddresses?.[0]?.emailAddress || '');
        if (!email) return null;
        return await db.get(
            'SELECT id, role, roles, email, status FROM users WHERE email = ?',
            [email]
        );
    } catch (err) {
        console.warn('[resolveUser] Clerk profile lookup failed:', err.message);
        return null;
    }
}

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ id: string, email: string, roles: string[], status: string } | null>}
 *          null when there is no valid session at all (caller should answer 401).
 */
export async function resolveUserFromRequest(req) {
    const clerkUserId = await resolveClerkUserId(req);
    if (!clerkUserId) return null;

    let row = await db.get(USER_COLUMNS, [clerkUserId]);
    if (!row) {
        row = await findRowByClerkEmail(clerkUserId);
    }
    if (!row) return null;

    return {
        id: row.id,
        email: normalizeEmail(row.email),
        roles: parseRolesFromStorage(row.roles, row.role),
        status: row.status,
    };
}
