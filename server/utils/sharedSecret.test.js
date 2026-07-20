import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { bearerSecret, timingSafeCompare } from './security.js';

vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(() => ({ userId: null })),
    createClerkClient: vi.fn(() => ({ users: { getUser: vi.fn() } })),
    verifyToken: vi.fn(),
    clerkMiddleware: () => (_req, _res, next) => next(),
}));

vi.mock('../db.js', () => ({
    default: {
        get: vi.fn(async () => ({ ok: 1 })),
        all: vi.fn(),
        run: vi.fn(),
        exec: vi.fn(),
        client: 'sqlite',
    },
    now: () => new Date().toISOString(),
}));

import { createApp } from '../app.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.VITE_DEMO_MODE = 'false';
});

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

describe('bearerSecret', () => {
    it('reads the token from the Authorization header', () => {
        expect(bearerSecret({ headers: { authorization: 'Bearer abc123' } })).toBe('abc123');
    });

    it('is case-insensitive on the scheme and trims the value', () => {
        expect(bearerSecret({ headers: { authorization: 'bearer   abc123  ' } })).toBe('abc123');
    });

    it('ignores non-Bearer schemes and empty tokens', () => {
        expect(bearerSecret({ headers: { authorization: 'Basic abc123' } })).toBe(null);
        expect(bearerSecret({ headers: { authorization: 'Bearer   ' } })).toBe(null);
        expect(bearerSecret({ headers: {} })).toBe(null);
    });

    it('never consults the query string', () => {
        expect(bearerSecret({ headers: {}, query: { token: 'abc123' } })).toBe(null);
    });
});

describe('timingSafeCompare', () => {
    it('matches identical secrets', () => {
        expect(timingSafeCompare('s3cret', 's3cret')).toBe(true);
    });

    it('rejects different secrets, including differing lengths', () => {
        expect(timingSafeCompare('s3cret', 's3cre')).toBe(false);
        expect(timingSafeCompare('s3cret', 'wrong')).toBe(false);
    });

    it('rejects null/undefined without throwing', () => {
        expect(timingSafeCompare(null, 's3cret')).toBe(false);
        expect(timingSafeCompare('s3cret', undefined)).toBe(false);
    });
});

describe('GET /api/health/db secret handling', () => {
    it('503s when the secret is unset', async () => {
        delete process.env.DB_PING_SECRET;

        const res = await request(createApp()).get('/api/health/db');

        expect(res.status).toBe(503);
    });

    // The regression: a secret in the query string used to be accepted, and would then be
    // captured by proxy and platform access logs.
    it('rejects the secret supplied as a query parameter', async () => {
        process.env.DB_PING_SECRET = 'ping-secret';

        const res = await request(createApp()).get('/api/health/db?token=ping-secret');

        expect(res.status).toBe(403);
    });

    it('accepts the secret in the Authorization header', async () => {
        process.env.DB_PING_SECRET = 'ping-secret';

        const res = await request(createApp())
            .get('/api/health/db')
            .set('Authorization', 'Bearer ping-secret');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('rejects a wrong secret', async () => {
        process.env.DB_PING_SECRET = 'ping-secret';

        const res = await request(createApp())
            .get('/api/health/db')
            .set('Authorization', 'Bearer nope');

        expect(res.status).toBe(403);
    });
});

describe('POST /api/manpower/sync/cron secret handling', () => {
    it('503s when the secret is unset', async () => {
        delete process.env.MANPOWER_SYNC_SECRET;

        const res = await request(createApp()).post('/api/manpower/sync/cron');

        expect(res.status).toBe(503);
    });

    it('rejects the secret supplied as a query parameter', async () => {
        process.env.MANPOWER_SYNC_SECRET = 'sync-secret';

        const res = await request(createApp()).post('/api/manpower/sync/cron?token=sync-secret');

        expect(res.status).toBe(403);
    });

    it('rejects a wrong secret in the header', async () => {
        process.env.MANPOWER_SYNC_SECRET = 'sync-secret';

        const res = await request(createApp())
            .post('/api/manpower/sync/cron')
            .set('Authorization', 'Bearer nope');

        expect(res.status).toBe(403);
    });
});

describe('POST /api/order-disputes/sync/cron secret handling', () => {
    it('rejects the secret supplied as a query parameter', async () => {
        process.env.ORDER_DISPUTE_SYNC_SECRET = 'od-secret';

        const res = await request(createApp()).post(
            '/api/order-disputes/sync/cron?token=od-secret'
        );

        expect(res.status).toBe(403);
    });

    it('rejects a wrong secret in the header', async () => {
        process.env.ORDER_DISPUTE_SYNC_SECRET = 'od-secret';

        const res = await request(createApp())
            .post('/api/order-disputes/sync/cron')
            .set('Authorization', 'Bearer nope');

        expect(res.status).toBe(403);
    });
});
