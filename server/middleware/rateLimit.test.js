import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
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
});
