import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(() => ({ userId: null })),
    createClerkClient: vi.fn(() => ({ users: { getUser: vi.fn() } })),
    verifyToken: vi.fn(),
    clerkMiddleware: () => (_req, _res, next) => next(),
}));

vi.mock('../db.js', () => ({
    default: { get: vi.fn(), all: vi.fn(), run: vi.fn(), exec: vi.fn(), client: 'sqlite' },
    now: () => new Date().toISOString(),
}));

import { getAuth } from '@clerk/express';
import db from '../db.js';
import { createApp } from '../app.js';

const ORIGINAL_ENV = { ...process.env };
let app;

function signedInAs({ id = 'user_1', email, roles, status = 'active' }) {
    getAuth.mockReturnValue({ userId: id });
    db.get.mockResolvedValue({
        id,
        email,
        roles: JSON.stringify(roles),
        role: roles[0],
        status,
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    process.env.NODE_ENV = 'test';
    process.env.VITE_DEMO_MODE = 'false';
    process.env.ALLOWED_EMAIL_DOMAINS = 'myfrido.com';
    process.env.GH_REPO = 'frido/dashboard';
    process.env.GH_TOKEN = 'gh-token';
    getAuth.mockReturnValue({ userId: null });
    app = createApp();
});

afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
});

describe('POST /api/exec-edit-trigger', () => {
    it('rejects unauthenticated callers', async () => {
        const res = await request(app)
            .post('/api/exec-edit-trigger')
            .send({ instruction: 'tweak a label' });

        expect(res.status).toBe(401);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects an authenticated non-admin', async () => {
        signedInAs({ email: 'staff@myfrido.com', roles: ['staff'] });

        const res = await request(app)
            .post('/api/exec-edit-trigger')
            .send({ instruction: 'tweak a label' });

        expect(res.status).toBe(403);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects a disabled admin', async () => {
        signedInAs({ email: 'admin@myfrido.com', roles: ['admin'], status: 'disabled' });

        const res = await request(app)
            .post('/api/exec-edit-trigger')
            .send({ instruction: 'tweak a label' });

        expect(res.status).toBe(403);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects an out-of-domain admin', async () => {
        signedInAs({ email: 'admin@gmail.com', roles: ['admin'] });

        const res = await request(app)
            .post('/api/exec-edit-trigger')
            .send({ instruction: 'tweak a label' });

        expect(res.status).toBe(403);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('dispatches once for an admin and attributes the request', async () => {
        signedInAs({ email: 'admin@myfrido.com', roles: ['admin'] });
        fetch.mockResolvedValue({ ok: true, text: async () => '' });

        const res = await request(app)
            .post('/api/exec-edit-trigger')
            .send({ instruction: 'Shorten the coupon label' });

        expect(res.status).toBe(202);
        expect(fetch).toHaveBeenCalledOnce();

        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://api.github.com/repos/frido/dashboard/dispatches');
        const body = JSON.parse(options.body);
        expect(body.event_type).toBe('exec-dashboard-edit');
        expect(body.client_payload.instruction).toBe('Shorten the coupon label');
        expect(body.client_payload.requested_by).toBe('admin@myfrido.com');
    });

    it('still validates instruction length for admins', async () => {
        signedInAs({ email: 'admin@myfrido.com', roles: ['admin'] });

        const tooLong = await request(app)
            .post('/api/exec-edit-trigger')
            .send({ instruction: 'x'.repeat(501) });
        expect(tooLong.status).toBe(400);

        const empty = await request(app).post('/api/exec-edit-trigger').send({ instruction: '  ' });
        expect(empty.status).toBe(400);

        expect(fetch).not.toHaveBeenCalled();
    });

    it('ignores a password in the body — the removed shared secret grants nothing', async () => {
        const res = await request(app)
            .post('/api/exec-edit-trigger')
            .send({ instruction: 'tweak', password: 'whatever-the-old-secret-was' });

        expect(res.status).toBe(401);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('no longer exposes /api/ist-edit-trigger', async () => {
        signedInAs({ email: 'admin@myfrido.com', roles: ['admin'] });

        const res = await request(app)
            .post('/api/ist-edit-trigger')
            .send({ instruction: 'tweak a label' });

        expect(res.status).toBe(404);
        expect(fetch).not.toHaveBeenCalled();
    });
});

// dashboardEdit is mounted at bare `/api` ahead of the health routes, so router-level
// auth middleware would swallow them. These guard that mounting mistake.
describe('health routes are unaffected by dashboardEdit auth', () => {
    it('GET /api/health stays public', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    it('unmatched /api paths still 404 as JSON rather than 401', async () => {
        const res = await request(app).get('/api/definitely-not-a-route');

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('API endpoint not found');
    });

    it('GET /api/health/db still answers its own secret check, not dashboardEdit auth', async () => {
        delete process.env.DB_PING_SECRET;
        const res = await request(app).get('/api/health/db');

        expect(res.status).toBe(503);
        expect(res.body.error).toContain('DB_PING_SECRET');
    });
});
