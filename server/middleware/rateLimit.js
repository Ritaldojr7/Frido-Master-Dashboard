/**
 * Rate limiters.
 *
 * Keyed by authenticated user id where available, falling back to IP. Keying on IP alone
 * would be wrong here: Frido staff share an office NAT, so a single public IP represents
 * dozens of people and a per-IP budget would lock out the whole office at once.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { getAuth } from '@clerk/express';

/**
 * Identify the caller for rate-limiting purposes.
 *
 * `req.user` is only populated after `verifyToken`, which route-level limiters run behind
 * but the global one does not. Falling back to the Clerk session id keeps the global limiter
 * per-user without a database lookup — important because Frido staff share an office NAT, so
 * an IP-keyed budget is really a whole-office budget.
 */
function callerKey(req) {
    if (req.user?.id) return req.user.id;
    try {
        const { userId } = getAuth(req);
        if (userId) return userId;
    } catch {
        /* Clerk middleware not mounted — fall through to IP. */
    }
    // `ipKeyGenerator` normalises IPv6 to its /64 prefix. Keying on the raw address would
    // let a client with an IPv6 allocation rotate addresses to evade the limit.
    return ipKeyGenerator(req.ip);
}

const TEST_MAX = 1_000_000;

function isTestEnv() {
    return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

/**
 * Budget for a *shipped* limiter, relaxed under test so the rest of the suite is not
 * throttled. `createRateLimiter` itself always honours the `max` it is given — otherwise
 * the 429 path could never be tested, which is precisely the branch worth testing.
 */
function budget(max) {
    return isTestEnv() ? TEST_MAX : max;
}

/**
 * @param {{ windowMs: number, max: number, name?: string }} options
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter({ windowMs, max, name = 'rate-limit' }) {
    return rateLimit({
        windowMs,
        limit: max,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        keyGenerator: callerKey,
        handler: (req, res) => {
            console.warn(`[${name}] limit exceeded for ${req.user?.email ?? req.ip}`);
            res.status(429).json({
                error: 'Too many requests. Please slow down and try again shortly.',
            });
        },
    });
}

/**
 * Broad backstop across the whole API surface.
 *
 * Sized for a single user, not an office: the SPA polls notices every 45s and several pages
 * poll their own data every 60s, so an active user with a couple of tabs open makes roughly
 * 100 requests per window before doing anything else. 600 leaves generous headroom while
 * still capping runaway clients.
 */
export const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: budget(600),
    name: 'api',
});

/** Triggers a GitHub workflow — deliberately tight. */
export const editTriggerLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: budget(5),
    name: 'edit-trigger',
});

/** Invitation and user-mutation endpoints. */
export const userMutationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: budget(20),
    name: 'user-mutation',
});

/** Shared-secret endpoints called by external schedulers. */
export const syncLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: budget(10),
    name: 'sync',
});
