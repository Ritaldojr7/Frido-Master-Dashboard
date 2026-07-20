import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(() => ({ userId: null })),
}));

import { getAuth } from '@clerk/express';
import { createRateLimiter } from './rateLimit.js';

/**
 * The shipped limiters are given a very high ceiling under NODE_ENV=test so the rest of the
 * suite is unaffected. These tests therefore build their own limiter with an explicit `max`
 * — otherwise the 429 path would never be exercised anywhere.
 */
function appWithLimiter(limiter, { attachUser } = {}) {
    const app = express();
    if (attachUser) {
        app.use((req, _res, next) => {
            req.user = attachUser(req);
            next();
        });
    }
    app.use(limiter);
    app.get('/ping', (_req, res) => res.json({ ok: true }));
    return app;
}

describe('createRateLimiter', () => {
    it('returns 429 once the limit is exceeded', async () => {
        const app = appWithLimiter(
            createRateLimiter({ windowMs: 60_000, max: 2, name: 'test' })
        );

        expect((await request(app).get('/ping')).status).toBe(200);
        expect((await request(app).get('/ping')).status).toBe(200);

        const blocked = await request(app).get('/ping');
        expect(blocked.status).toBe(429);
        expect(blocked.body.error).toMatch(/too many requests/i);
    });

    it('advertises a retry hint when blocking', async () => {
        const app = appWithLimiter(
            createRateLimiter({ windowMs: 60_000, max: 1, name: 'test' })
        );

        await request(app).get('/ping');
        const blocked = await request(app).get('/ping');

        expect(blocked.status).toBe(429);
        // draft-7 standard headers carry the reset hint.
        expect(blocked.headers['ratelimit'] ?? blocked.headers['retry-after']).toBeDefined();
    });

    it('budgets per user rather than per IP when authenticated', async () => {
        let currentUser = 'user_a';
        const app = appWithLimiter(
            createRateLimiter({ windowMs: 60_000, max: 1, name: 'test' }),
            { attachUser: () => ({ id: currentUser }) }
        );

        expect((await request(app).get('/ping')).status).toBe(200);
        expect((await request(app).get('/ping')).status).toBe(429);

        // A different user shares the same source IP (office NAT) and must not be blocked.
        currentUser = 'user_b';
        expect((await request(app).get('/ping')).status).toBe(200);
    });

    /**
     * The global limiter is mounted before any `verifyToken`, so `req.user` is unset and it
     * must fall back to the Clerk session id. Without this it silently degrades to IP keying,
     * which turns a per-user budget into a per-office one.
     */
    it('falls back to the Clerk session id when req.user is not yet populated', async () => {
        let clerkUser = 'clerk_a';
        getAuth.mockImplementation(() => ({ userId: clerkUser }));

        const app = appWithLimiter(createRateLimiter({ windowMs: 60_000, max: 1, name: 'test' }));

        expect((await request(app).get('/ping')).status).toBe(200);
        expect((await request(app).get('/ping')).status).toBe(429);

        // Second user, same IP, no req.user anywhere — must get their own budget.
        clerkUser = 'clerk_b';
        expect((await request(app).get('/ping')).status).toBe(200);
    });

    it('falls back to IP when Clerk middleware is not mounted', async () => {
        getAuth.mockImplementation(() => {
            throw new Error('clerkMiddleware is required');
        });

        const app = appWithLimiter(createRateLimiter({ windowMs: 60_000, max: 1, name: 'test' }));

        expect((await request(app).get('/ping')).status).toBe(200);
        expect((await request(app).get('/ping')).status).toBe(429);
    });
});

describe('apiLimiter mounting', () => {
    /**
     * Guards the ordering bug directly: if `app.use('/api', apiLimiter)` is moved back above
     * `clerkMiddleware`, getAuth throws and every request keys on the shared office IP.
     */
    it('is mounted after clerkMiddleware in app.js', async () => {
        const { readFileSync } = await import('fs');
        const { fileURLToPath } = await import('url');
        const path = await import('path');

        const appSource = readFileSync(
            path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app.js'),
            'utf8'
        );

        const clerkAt = appSource.indexOf('clerkMiddleware({');
        const limiterAt = appSource.indexOf("app.use('/api', apiLimiter)");

        expect(clerkAt).toBeGreaterThan(-1);
        expect(limiterAt).toBeGreaterThan(-1);
        expect(limiterAt).toBeGreaterThan(clerkAt);
    });
});
