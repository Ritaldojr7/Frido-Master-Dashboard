import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(),
    createClerkClient: vi.fn(() => ({ users: { getUser: vi.fn() } })),
    verifyToken: vi.fn(),
}));

vi.mock('../db.js', () => ({
    default: { get: vi.fn() },
    now: () => new Date().toISOString(),
}));

import { getAuth, verifyToken as clerkVerifyToken } from '@clerk/express';
import db from '../db.js';
import {
    protectStaticDashboards,
    isProtectedStaticPath,
    isAuthorizedForPrefix,
    matchedPrefix,
    STATIC_DASHBOARD_POLICIES,
    PROTECTED_STATIC_PREFIXES,
} from './protectStaticDashboards.js';

function createMocks(path, headers = {}) {
    const req = { path, headers };
    const res = {
        statusCode: 200,
        body: '',
        status(code) {
            this.statusCode = code;
            return this;
        },
        type() {
            return this;
        },
        send(payload) {
            this.body = payload;
            return this;
        },
    };
    const next = vi.fn();
    return { req, res, next };
}

/** Seed the DB mock with the row `resolveUserFromRequest` will look up. */
function signedInAs({ id = 'user_123', email, roles, status = 'active' }) {
    getAuth.mockReturnValue({ userId: id });
    db.get.mockResolvedValue({
        id,
        email,
        roles: JSON.stringify(roles),
        role: roles[0],
        status,
    });
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_DEMO_MODE = 'false';
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_EMAIL_DOMAINS = 'myfrido.com';
    delete process.env.SALARY_ANALYSIS_EMAILS;
    delete process.env.VITE_SALARY_ANALYSIS_EMAILS;
    delete process.env.ISD_DASHBOARD_EMAILS;
    delete process.env.VITE_ISD_DASHBOARD_EMAILS;
    delete process.env.STORE_EMAIL_MAP;
    delete process.env.VITE_STORE_EMAIL_MAP;
});

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

describe('path matching', () => {
    it('allows unprotected asset paths', () => {
        expect(isProtectedStaticPath('/assets/logo.png')).toBe(false);
        expect(isProtectedStaticPath('/')).toBe(false);
    });

    it('marks static dashboard paths as protected', () => {
        expect(isProtectedStaticPath('/exec-dashboard/index.html')).toBe(true);
        expect(isProtectedStaticPath('/salary-analysis/index.html')).toBe(true);
    });

    it('resolves the longest matching prefix', () => {
        expect(matchedPrefix('/salary-analysis/index.html')).toBe('/salary-analysis');
        expect(matchedPrefix('/assets/app.js')).toBe(null);
    });
});

describe('isAuthorizedForPrefix', () => {
    it('denies a prefix with no policy entry (fail closed)', () => {
        expect(
            isAuthorizedForPrefix('/some-new-dashboard', { email: 'a@myfrido.com', roles: ['admin'] })
        ).toBe(false);
        expect(isAuthorizedForPrefix(null, { email: 'a@myfrido.com', roles: ['admin'] })).toBe(false);
    });

    it('every protected prefix has a policy', () => {
        for (const prefix of PROTECTED_STATIC_PREFIXES) {
            expect(STATIC_DASHBOARD_POLICIES[prefix], `missing policy for ${prefix}`).toBeDefined();
        }
    });

    it('salary: admin allowed, all others denied', () => {
        const admin = { email: 'admin@myfrido.com', roles: ['admin'] };
        expect(isAuthorizedForPrefix('/salary-analysis', admin)).toBe(true);

        const staff = { email: 'staff@myfrido.com', roles: ['staff'] };
        expect(isAuthorizedForPrefix('/salary-analysis', staff)).toBe(false);

        const dataAnalyst = { email: 'da@myfrido.com', roles: ['data_analyst'] };
        expect(isAuthorizedForPrefix('/salary-analysis', dataAnalyst)).toBe(false);
    });

    it('exec-dashboard: admin allowed, data_analyst denied', () => {
        const admin = { email: 'admin@myfrido.com', roles: ['admin'] };
        expect(isAuthorizedForPrefix('/exec-dashboard', admin)).toBe(true);

        const dataAnalyst = { email: 'da@myfrido.com', roles: ['data_analyst'] };
        expect(isAuthorizedForPrefix('/exec-dashboard', dataAnalyst)).toBe(false);
    });

    it('fes-sm: admins pass outright, others need store-map membership', () => {
        process.env.STORE_EMAIL_MAP = '{"mgr@myfrido.com":"Pune"}';
        expect(
            isAuthorizedForPrefix('/fes-sm-dashboard', { email: 'admin@myfrido.com', roles: ['admin'] })
        ).toBe(true);
        expect(
            isAuthorizedForPrefix('/fes-sm-dashboard', { email: 'mgr@myfrido.com', roles: ['staff'] })
        ).toBe(true);
        // A plain staff user who does not manage a store must NOT get in — this is the
        // behaviour the SPA already enforced client-side.
        expect(
            isAuthorizedForPrefix('/fes-sm-dashboard', { email: 'other@myfrido.com', roles: ['staff'] })
        ).toBe(false);
    });

    it('fes-sm: empty store map falls back to admin/staff', () => {
        expect(
            isAuthorizedForPrefix('/fes-sm-dashboard', { email: 'other@myfrido.com', roles: ['staff'] })
        ).toBe(true);
    });

    it('role-gated prefixes admit only their listed roles', () => {
        expect(
            isAuthorizedForPrefix('/orm-dashboard', { email: 'o@myfrido.com', roles: ['orm_lead'] })
        ).toBe(true);
        expect(
            isAuthorizedForPrefix('/orm-dashboard', { email: 's@myfrido.com', roles: ['staff'] })
        ).toBe(false);
        expect(
            isAuthorizedForPrefix('/ist-console', { email: 's@myfrido.com', roles: ['staff'] })
        ).toBe(false);
        expect(
            isAuthorizedForPrefix('/retail-feedback', { email: 'f@myfrido.com', roles: ['feedback_head'] })
        ).toBe(true);
        expect(
            isAuthorizedForPrefix('/retail-feedback', { email: 'f@myfrido.com', roles: ['feedback'] })
        ).toBe(false);
    });

    it('honours multi-role users', () => {
        expect(
            isAuthorizedForPrefix('/orm-dashboard', {
                email: 'm@myfrido.com',
                roles: ['staff', 'orm_lead'],
            })
        ).toBe(true);
    });
});

describe('protectStaticDashboards middleware', () => {
    it('returns 401 without a Clerk session', async () => {
        getAuth.mockReturnValue({ userId: null });

        const { req, res, next } = createMocks('/exec-dashboard/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
        expect(res.body).toContain('Authentication required');
    });

    // The regression this whole task exists for.
    it('returns 403 when a staff user requests the salary dashboard', async () => {
        process.env.SALARY_ANALYSIS_EMAILS = 'cfo@myfrido.com';
        signedInAs({ email: 'retail@myfrido.com', roles: ['staff'] });

        const { req, res, next } = createMocks('/salary-analysis/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        expect(res.body).toContain('Access restricted');
    });

    it('does not leak the policy or allowlist in the 403 body', async () => {
        process.env.SALARY_ANALYSIS_EMAILS = 'cfo@myfrido.com';
        signedInAs({ email: 'retail@myfrido.com', roles: ['staff'] });

        const { req, res, next } = createMocks('/salary-analysis/index.html');
        await protectStaticDashboards(req, res, next);

        expect(res.body).not.toContain('cfo@myfrido.com');
        expect(res.body).not.toContain('salary-analysis');
    });

    it('returns 403 for a staff user on exec-dashboard and ist-console', async () => {
        for (const path of ['/exec-dashboard/', '/ist-console/index.html']) {
            signedInAs({ email: 'retail@myfrido.com', roles: ['staff'] });
            const { req, res, next } = createMocks(path);
            await protectStaticDashboards(req, res, next);
            expect(next, `expected denial for ${path}`).not.toHaveBeenCalled();
            expect(res.statusCode).toBe(403);
        }
    });

    it('admits an admin to every prefix when no email allowlists are configured', async () => {
        for (const prefix of PROTECTED_STATIC_PREFIXES) {
            signedInAs({ email: 'admin@myfrido.com', roles: ['admin'] });
            const { req, res, next } = createMocks(`${prefix}/index.html`);
            await protectStaticDashboards(req, res, next);
            expect(next, `expected admin access to ${prefix}`).toHaveBeenCalledOnce();
        }
    });

    it('denies a non-admin to the salary dashboard even with email env set', async () => {
        process.env.SALARY_ANALYSIS_EMAILS = 'cfo@myfrido.com';
        signedInAs({ email: 'cfo@myfrido.com', roles: ['staff'] });

        const { req, res, next } = createMocks('/salary-analysis/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('returns 403 for a disabled user who would otherwise pass', async () => {
        signedInAs({ email: 'admin@myfrido.com', roles: ['admin'], status: 'disabled' });

        const { req, res, next } = createMocks('/ist-console/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('returns 403 for an out-of-domain email', async () => {
        signedInAs({ email: 'contractor@gmail.com', roles: ['admin'] });

        const { req, res, next } = createMocks('/ist-console/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    // Previously a bare `Bearer` header was enough to pass. Now it must authorize.
    it('requires full authorization for Bearer-token callers, not merely a token', async () => {
        getAuth.mockReturnValue({ userId: null });
        clerkVerifyToken.mockResolvedValue({ sub: 'user_staff' });
        db.get.mockResolvedValue({
            id: 'user_staff',
            email: 'retail@myfrido.com',
            roles: JSON.stringify(['staff']),
            role: 'staff',
            status: 'active',
        });

        const { req, res, next } = createMocks('/salary-analysis/index.html', {
            authorization: 'Bearer some-token',
        });
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('returns 401 when a Bearer token fails verification', async () => {
        getAuth.mockReturnValue({ userId: null });
        clerkVerifyToken.mockRejectedValue(new Error('invalid token'));

        const { req, res, next } = createMocks('/salary-analysis/index.html', {
            authorization: 'Bearer bogus',
        });
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
    });

    it('fails closed when the database is unavailable', async () => {
        getAuth.mockReturnValue({ userId: 'user_123' });
        db.get.mockRejectedValue(new Error('connection refused'));

        const { req, res, next } = createMocks('/ist-console/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('passes through unprotected paths untouched', async () => {
        const { req, res, next } = createMocks('/assets/app.js');
        await protectStaticDashboards(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(db.get).not.toHaveBeenCalled();
    });

    it('bypasses authorization in non-production demo mode', async () => {
        process.env.VITE_DEMO_MODE = 'true';
        process.env.NODE_ENV = 'development';

        const { req, res, next } = createMocks('/salary-analysis/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(db.get).not.toHaveBeenCalled();
    });

    it('does NOT bypass in production even if demo mode is set', async () => {
        process.env.VITE_DEMO_MODE = 'true';
        process.env.NODE_ENV = 'production';
        getAuth.mockReturnValue({ userId: null });

        const { req, res, next } = createMocks('/salary-analysis/index.html');
        await protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
    });
});
