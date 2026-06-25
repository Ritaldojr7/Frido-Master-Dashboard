import { describe, it, expect } from 'vitest';
import { formatRolesSummary, normalizeRoleSelection } from './roleOptions';

describe('roleOptions', () => {
    it('formats single and multiple role labels', () => {
        expect(formatRolesSummary(['team_lead'])).toBe('Team Lead');
        expect(formatRolesSummary(['staff', 'feedback'])).toBe('Staff, Feedback');
        expect(formatRolesSummary(['admin'])).toBe('Admin');
    });

    it('enforces admin as exclusive role', () => {
        expect(normalizeRoleSelection(['staff', 'feedback'], 'admin', true)).toEqual(['admin']);
        expect(normalizeRoleSelection(['admin'], 'staff', true)).toEqual(['staff']);
    });
});
