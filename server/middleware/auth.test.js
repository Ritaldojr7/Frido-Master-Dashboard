/**
 * Unit tests for requireRole middleware
 * Validates that role-based access control works correctly.
 */
import { describe, it, expect, vi } from 'vitest';
import { requireRole } from './auth.js';

// Helper to create mock req/res/next
function createMocks(userProps = {}) {
    const req = { user: userProps.user ?? undefined };
    const res = {
        _status: null,
        _json: null,
        status(code) { this._status = code; return this; },
        json(body) { this._json = body; return this; },
    };
    const next = vi.fn();
    return { req, res, next };
}

describe('requireRole', () => {
    it('calls next() when user has an allowed role', () => {
        const middleware = requireRole(['admin']);
        const { req, res, next } = createMocks({ user: { id: '1', role: 'admin', email: 'a@b.com' } });

        middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(res._status).toBeNull();
    });

    it('returns 403 when user role is not in the allowed list', () => {
        const middleware = requireRole(['admin']);
        const { req, res, next } = createMocks({ user: { id: '1', role: 'staff', email: 'a@b.com' } });

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(403);
        expect(res._json.error).toBe('Insufficient permissions');
        expect(res._json.required).toEqual(['admin']);
        expect(res._json.current).toBe('staff');
    });

    it('returns 401 when req.user is missing', () => {
        const middleware = requireRole(['admin']);
        const { req, res, next } = createMocks({ user: undefined });

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res._status).toBe(401);
    });

    it('accepts any of multiple allowed roles', () => {
        const middleware = requireRole(['admin', 'staff']);
        const { req, res, next } = createMocks({ user: { id: '1', role: 'staff', email: 'a@b.com' } });

        middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
    });
});
