/**
 * Unit tests for server/utils/userImport.js
 */
import { describe, it, expect, afterEach } from 'vitest';
import { validateImportRow } from './userImport.js';

describe('validateImportRow', () => {
    const ORIGINAL_ENV = process.env.ALLOWED_EMAIL_DOMAINS;

    afterEach(() => {
        if (ORIGINAL_ENV === undefined) {
            delete process.env.ALLOWED_EMAIL_DOMAINS;
        } else {
            process.env.ALLOWED_EMAIL_DOMAINS = ORIGINAL_ENV;
        }
    });

    it('accepts a valid row with normalised email and role', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS;
        const r = validateImportRow({ email: ' Ada@myfrido.com ', name: 'Ada', role: 'team_lead' }, 0);
        expect(r.ok).toBe(true);
        expect(r.email).toBe('ada@myfrido.com');
        expect(r.role).toBe('team_lead');
        expect(r.errors).toHaveLength(0);
    });

    it('maps common header aliases (case-insensitive keys)', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS;
        const r = validateImportRow({ Email: 'b@myfrido.com', Name: 'Bee', Role: 'staff', Department: 'HQ' }, 2);
        expect(r.ok).toBe(true);
        expect(r.department).toBe('HQ');
    });

    it('fails when domain is not allowlisted', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS;
        const r = validateImportRow({ email: 'x@gmail.com', name: 'X', role: 'staff' }, 0);
        expect(r.ok).toBe(false);
        expect(r.errors.some((e) => e.includes('domain'))).toBe(true);
    });

    it('fails on invalid role slug', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS;
        const r = validateImportRow({ email: 'c@myfrido.com', name: 'C', role: 'superuser' }, 0);
        expect(r.ok).toBe(false);
        expect(r.errors.some((e) => e.includes('invalid role'))).toBe(true);
    });

    it('fails when email or name missing', () => {
        delete process.env.ALLOWED_EMAIL_DOMAINS;
        expect(validateImportRow({ email: '', name: 'N', role: 'staff' }, 0).ok).toBe(false);
        expect(validateImportRow({ email: 'd@myfrido.com', name: '  ', role: 'staff' }, 0).ok).toBe(false);
    });
});
