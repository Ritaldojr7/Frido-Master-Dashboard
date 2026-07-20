import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(() => ({ userId: null })),
    createClerkClient: vi.fn(() => ({ users: { getUser: vi.fn() } })),
    verifyToken: vi.fn(),
    clerkMiddleware: () => (_req, _res, next) => next(),
}));

vi.mock('./db.js', () => ({
    default: { get: vi.fn(), all: vi.fn(), run: vi.fn(), exec: vi.fn(), client: 'sqlite' },
    now: () => new Date().toISOString(),
}));

import { createApp } from './app.js';
import { buildAllowedOrigins, createCorsOriginCallback } from './utils/corsOrigins.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.VITE_DEMO_MODE = 'false';
    process.env.APP_URL = 'https://dashboard.myfrido.com';
    process.env.FRONTEND_URL = 'https://app.myfrido.com';
    delete process.env.CORS_ALLOWED_ORIGINS;
});

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

describe('buildAllowedOrigins', () => {
    it('collects APP_URL, FRONTEND_URL and CORS_ALLOWED_ORIGINS', () => {
        const allowed = buildAllowedOrigins({
            NODE_ENV: 'production',
            APP_URL: 'https://a.myfrido.com',
            FRONTEND_URL: 'https://b.myfrido.com',
            CORS_ALLOWED_ORIGINS: 'https://c.myfrido.com, https://d.myfrido.com',
        });

        expect(allowed).toEqual([
            'https://a.myfrido.com',
            'https://b.myfrido.com',
            'https://c.myfrido.com',
            'https://d.myfrido.com',
        ]);
    });

    it('normalises trailing slashes and de-duplicates', () => {
        const allowed = buildAllowedOrigins({
            NODE_ENV: 'production',
            APP_URL: 'https://a.myfrido.com/',
            FRONTEND_URL: 'https://a.myfrido.com',
        });

        expect(allowed).toEqual(['https://a.myfrido.com']);
    });

    it('adds localhost outside production only', () => {
        expect(buildAllowedOrigins({ NODE_ENV: 'development' })).toContain('http://localhost:3005');
        expect(buildAllowedOrigins({ NODE_ENV: 'production' })).not.toContain(
            'http://localhost:3005'
        );
    });

    it('resolves to an empty list in production when nothing is configured', () => {
        expect(buildAllowedOrigins({ NODE_ENV: 'production' })).toEqual([]);
    });
});

describe('createCorsOriginCallback', () => {
    function decide(env, origin) {
        return new Promise((resolve) => {
            createCorsOriginCallback(env)(origin, (_err, allowed) => resolve(allowed));
        });
    }

    it('allows a configured origin', async () => {
        await expect(
            decide({ NODE_ENV: 'production', APP_URL: 'https://a.myfrido.com' }, 'https://a.myfrido.com')
        ).resolves.toBe(true);
    });

    it('rejects an unknown origin', async () => {
        await expect(
            decide({ NODE_ENV: 'production', APP_URL: 'https://a.myfrido.com' }, 'https://evil.example')
        ).resolves.toBe(false);
    });

    it('allows requests with no Origin header (same-origin / server-to-server)', async () => {
        await expect(decide({ NODE_ENV: 'production' }, undefined)).resolves.toBe(true);
    });

    it('denies everything cross-origin in production when unconfigured', async () => {
        await expect(decide({ NODE_ENV: 'production' }, 'https://a.myfrido.com')).resolves.toBe(false);
    });
});

describe('CORS on the running app', () => {
    it('does not reflect an untrusted origin', async () => {
        const res = await request(createApp())
            .get('/api/health')
            .set('Origin', 'https://evil.example');

        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('reflects a configured origin with credentials', async () => {
        const res = await request(createApp())
            .get('/api/health')
            .set('Origin', 'https://app.myfrido.com');

        expect(res.headers['access-control-allow-origin']).toBe('https://app.myfrido.com');
        expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('leaves same-origin requests untouched', async () => {
        const res = await request(createApp()).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});

describe('security headers', () => {
    it('permits same-origin framing so iframe dashboards keep working', async () => {
        const res = await request(createApp()).get('/api/health');

        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(res.headers['content-security-policy-report-only']).toContain(
            "frame-ancestors 'self'"
        );
    });

    it('ships CSP in report-only mode, not enforcing', async () => {
        const res = await request(createApp()).get('/api/health');

        expect(res.headers['content-security-policy']).toBeUndefined();
        expect(res.headers['content-security-policy-report-only']).toBeDefined();
    });

    it('sets baseline hardening headers', async () => {
        const res = await request(createApp()).get('/api/health');

        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('omits HSTS outside production', async () => {
        const res = await request(createApp()).get('/api/health');

        expect(res.headers['strict-transport-security']).toBeUndefined();
    });
});
