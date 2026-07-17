import { describe, it, expect, vi } from 'vitest';
import { protectStaticDashboards, isProtectedStaticPath } from './protectStaticDashboards.js';

vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(),
}));

import { getAuth } from '@clerk/express';

function createMocks(path) {
    const req = { path, headers: {} };
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

describe('protectStaticDashboards', () => {
    it('allows unprotected asset paths', () => {
        expect(isProtectedStaticPath('/assets/logo.png')).toBe(false);
        expect(isProtectedStaticPath('/')).toBe(false);
    });

    it('marks static dashboard paths as protected', () => {
        expect(isProtectedStaticPath('/exec-dashboard/index.html')).toBe(true);
        expect(isProtectedStaticPath('/salary-analysis/index.html')).toBe(true);
    });

    it('returns 401 for protected dashboards without a Clerk session', () => {
        getAuth.mockReturnValue({ userId: null });
        process.env.VITE_DEMO_MODE = 'false';
        process.env.NODE_ENV = 'production';

        const { req, res, next } = createMocks('/exec-dashboard/index.html');
        protectStaticDashboards(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(401);
        expect(res.body).toContain('Authentication required');
    });

    it('allows protected dashboards when Clerk session is present', () => {
        getAuth.mockReturnValue({ userId: 'user_123' });
        process.env.VITE_DEMO_MODE = 'false';
        process.env.NODE_ENV = 'production';

        const { req, res, next } = createMocks('/exec-dashboard/index.html');
        protectStaticDashboards(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res.statusCode).toBe(200);
    });
});
