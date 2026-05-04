/**
 * Unit tests for server/utils/security.js
 * Tests email normalisation, role validation, token helpers, and domain checks.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
    VALID_ROLES,
    normalizeEmail,
    normalizeRole,
    createRawToken,
    hashToken,
    getAllowedDomains,
    isAllowedCompanyEmail,
} from './security.js';

// ── VALID_ROLES ──────────────────────────────────────────

describe('VALID_ROLES', () => {
    it('contains exactly admin and staff', () => {
        expect(VALID_ROLES).toEqual(['admin', 'staff']);
    });

    it('does not contain manager', () => {
        expect(VALID_ROLES).not.toContain('manager');
    });
});

// ── normalizeEmail ───────────────────────────────────────

describe('normalizeEmail', () => {
    it('lowercases and trims an email', () => {
        expect(normalizeEmail('  Admin@MyFrido.COM  ')).toBe('admin@myfrido.com');
    });

    it('returns empty string for null / undefined', () => {
        expect(normalizeEmail(null)).toBe('');
        expect(normalizeEmail(undefined)).toBe('');
        expect(normalizeEmail('')).toBe('');
    });
});

// ── normalizeRole ────────────────────────────────────────

describe('normalizeRole', () => {
    it('accepts valid roles unchanged', () => {
        expect(normalizeRole('Admin')).toBe('admin');
        expect(normalizeRole('STAFF')).toBe('staff');
    });

    it('falls back to staff for unknown roles', () => {
        expect(normalizeRole('manager')).toBe('staff');
        expect(normalizeRole('superadmin')).toBe('staff');
        expect(normalizeRole('')).toBe('staff');
        expect(normalizeRole(undefined)).toBe('staff');
    });
});

// ── createRawToken / hashToken ───────────────────────────

describe('token utilities', () => {
    it('createRawToken returns a 64-character hex string', () => {
        const token = createRawToken();
        expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('two tokens are never the same', () => {
        const a = createRawToken();
        const b = createRawToken();
        expect(a).not.toBe(b);
    });

    it('hashToken produces a consistent SHA-256 hash', () => {
        const token = 'test-token-123';
        const hash1 = hashToken(token);
        const hash2 = hashToken(token);
        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('hashToken produces different hashes for different inputs', () => {
        expect(hashToken('a')).not.toBe(hashToken('b'));
    });
});

// ── getAllowedDomains / isAllowedCompanyEmail ─────────────

describe('domain allowlist', () => {
    const ORIGINAL_ENV = process.env.ALLOWED_EMAIL_DOMAINS;

    afterEach(() => {
        if (ORIGINAL_ENV === undefined) {
            delete process.env.ALLOWED_EMAIL_DOMAINS;
        } else {
            process.env.ALLOWED_EMAIL_DOMAINS = ORIGINAL_ENV;
        }
    });

    it('defaults to myfrido.com when env var is unset', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS;
        expect(getAllowedDomains()).toEqual(['myfrido.com']);
    });

    it('parses a comma-separated list and normalises domains', () => {
        process.env.ALLOWED_EMAIL_DOMAINS = ' MyFrido.com , @example.org ';
        const domains = getAllowedDomains();
        expect(domains).toContain('myfrido.com');
        expect(domains).toContain('example.org');
    });

    it('isAllowedCompanyEmail accepts valid domain emails', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS; // defaults to myfrido.com
        expect(isAllowedCompanyEmail('user@myfrido.com')).toBe(true);
    });

    it('isAllowedCompanyEmail rejects unknown domains', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS;
        expect(isAllowedCompanyEmail('user@gmail.com')).toBe(false);
    });

    it('isAllowedCompanyEmail rejects bad input', () => {
        expect(isAllowedCompanyEmail('')).toBe(false);
        expect(isAllowedCompanyEmail('not-an-email')).toBe(false);
    });
});
