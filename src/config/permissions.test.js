/**
 * Unit tests for src/config/permissions.js
 * Validates role constants, route permissions, and access control logic.
 */
import { describe, it, expect } from 'vitest';
import {
    ROLES,
    ALL_ROLES,
    ADMIN_ONLY,
    STAFF_ONLY,
    FEEDBACK_DEPARTMENT_ROLES,
    PROFILE_ROLES,
    routePermissions,
    sidebarPermissions,
    hasAccess,
} from './permissions';

// ── Role constants ───────────────────────────────────────

describe('ROLES', () => {
    it('defines admin and staff', () => {
        expect(ROLES.ADMIN).toBe('admin');
        expect(ROLES.STAFF).toBe('staff');
    });

    it('does not define manager', () => {
        expect(ROLES).not.toHaveProperty('MANAGER');
    });

    it('defines feedback department role', () => {
        expect(ROLES.FEEDBACK).toBe('feedback');
    });

    it('keeps viewer as a legacy alias', () => {
        expect(ROLES.VIEWER).toBe('viewer');
    });
});

describe('role arrays', () => {
    it('ALL_ROLES includes admin, staff, viewer', () => {
        expect(ALL_ROLES).toContain('admin');
        expect(ALL_ROLES).toContain('staff');
        expect(ALL_ROLES).toContain('viewer');
    });

    it('ADMIN_ONLY contains only admin', () => {
        expect(ADMIN_ONLY).toEqual(['admin']);
    });

    it('STAFF_ONLY does not include admin', () => {
        expect(STAFF_ONLY).not.toContain('admin');
        expect(STAFF_ONLY).toContain('staff');
    });
});

// ── Route permissions ────────────────────────────────────

describe('routePermissions', () => {
    it('locks admin page to admins', () => {
        expect(routePermissions['/admin']).toEqual(ADMIN_ONLY);
    });

    it('allows all roles to access retail-staff', () => {
        expect(routePermissions['/retail-staff']).toEqual(ALL_ROLES);
    });

    it('allows all roles to access profile including feedback', () => {
        expect(routePermissions['/profile']).toEqual(PROFILE_ROLES);
    });

    it('locks business analytics to admins', () => {
        expect(routePermissions['/business-analytics']).toEqual(ADMIN_ONLY);
    });

    it('allows admins and feedback role to access feedback department', () => {
        expect(routePermissions['/feedback-department']).toEqual(FEEDBACK_DEPARTMENT_ROLES);
    });
});

// ── Sidebar permissions ──────────────────────────────────

describe('sidebarPermissions', () => {
    it('mirrors route-level access for admin pages', () => {
        expect(sidebarPermissions['/admin']).toEqual(ADMIN_ONLY);
        expect(sidebarPermissions['/retail-admin']).toEqual(ADMIN_ONLY);
    });

    it('shows retail-staff to everyone', () => {
        expect(sidebarPermissions['/retail-staff']).toEqual(ALL_ROLES);
    });
    it('shows feedback department to admins and feedback users', () => {
        expect(sidebarPermissions['/feedback-department']).toEqual(FEEDBACK_DEPARTMENT_ROLES);
    });
});

// ── hasAccess ────────────────────────────────────────────

describe('hasAccess', () => {
    it('grants admin access to all routes', () => {
        expect(hasAccess('admin', '/admin')).toBe(true);
        expect(hasAccess('admin', '/retail-staff')).toBe(true);
        expect(hasAccess('admin', '/profile')).toBe(true);
        expect(hasAccess('admin', '/business-analytics')).toBe(true);
        expect(hasAccess('admin', '/feedback-department')).toBe(true);
    });

    it('denies staff access to admin-only routes', () => {
        expect(hasAccess('staff', '/admin')).toBe(false);
        expect(hasAccess('staff', '/retail-admin')).toBe(false);
        expect(hasAccess('staff', '/business-analytics')).toBe(false);
        expect(hasAccess('staff', '/feedback-department')).toBe(false);
    });

    it('grants staff access to staff routes', () => {
        expect(hasAccess('staff', '/retail-staff')).toBe(true);
        expect(hasAccess('staff', '/profile')).toBe(true);
    });

    it('returns true for unlisted routes (open by default)', () => {
        expect(hasAccess('staff', '/some-unknown-page')).toBe(true);
        expect(hasAccess('admin', '/some-unknown-page')).toBe(true);
    });

    it('allows feedback users feedback department and profile only among restricted routes', () => {
        expect(hasAccess('feedback', '/feedback-department')).toBe(true);
        expect(hasAccess('feedback', '/profile')).toBe(true);
        expect(hasAccess('feedback', '/retail-staff')).toBe(false);
        expect(hasAccess('feedback', '/admin')).toBe(false);
    });
});
