/**
 * Rate limiters.
 *
 * Keyed by authenticated user id where available, falling back to IP. Keying on IP alone
 * would be wrong here: Frido staff share an office NAT, so a single public IP represents
 * dozens of people and a per-IP budget would lock out the whole office at once.
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

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
        // `ipKeyGenerator` normalises IPv6 to its /64 prefix. Keying on the raw address
        // would let a client with an IPv6 allocation rotate addresses to evade the limit.
        keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
        handler: (req, res) => {
            console.warn(`[${name}] limit exceeded for ${req.user?.email ?? req.ip}`);
            res.status(429).json({
                error: 'Too many requests. Please slow down and try again shortly.',
            });
        },
    });
}

/** Broad backstop across the whole API surface. */
export const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: budget(300),
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
