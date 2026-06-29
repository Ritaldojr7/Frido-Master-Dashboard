import { describe, it, expect } from 'vitest';
import {
    normalizeRolesArray,
    parseRolesFromStorage,
    hasAnyRole,
    highestIsdRole,
    parseRolesFromImportString,
    rolesToDbColumns,
} from './roles.js';

describe('normalizeRolesArray', () => {
    it('dedupes and validates roles', () => {
        expect(normalizeRolesArray(['staff', 'feedback', 'staff'])).toEqual(['staff', 'feedback']);
    });

    it('admin cannot be combined with other roles', () => {
        expect(normalizeRolesArray(['admin', 'staff'])).toEqual(['admin']);
    });

    it('defaults empty to staff', () => {
        expect(normalizeRolesArray([])).toEqual(['staff']);
    });
});

describe('parseRolesFromStorage', () => {
    it('reads JSON roles column', () => {
        expect(parseRolesFromStorage('["staff","feedback"]', 'staff')).toEqual(['staff', 'feedback']);
    });

    it('falls back to legacy role column', () => {
        expect(parseRolesFromStorage(null, 'executive')).toEqual(['executive']);
    });
});

describe('hasAnyRole', () => {
    it('allows multi-role user when any role matches', () => {
        expect(hasAnyRole({ roles: ['staff', 'feedback'] }, ['feedback'])).toBe(true);
        expect(hasAnyRole({ roles: ['staff', 'feedback'] }, ['executive'])).toBe(false);
    });

    it('admin always passes', () => {
        expect(hasAnyRole({ roles: ['admin'] }, ['feedback'])).toBe(true);
    });
});

describe('highestIsdRole', () => {
    it('prefers team_lead over executive', () => {
        expect(highestIsdRole(['executive', 'team_lead'])).toBe('team_lead');
    });
});

describe('parseRolesFromImportString', () => {
    it('parses comma-separated roles', () => {
        expect(parseRolesFromImportString('staff, feedback')).toEqual(['staff', 'feedback']);
    });
});

describe('rolesToDbColumns', () => {
    it('syncs primary role column', () => {
        const { roles, role } = rolesToDbColumns(['staff', 'feedback']);
        expect(JSON.parse(roles)).toEqual(['staff', 'feedback']);
        expect(role).toBe('feedback');
    });
});
