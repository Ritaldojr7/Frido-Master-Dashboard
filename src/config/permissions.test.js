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
    ISD_NM_ROLES,
    routePermissions,
    sidebarPermissions,
    hasAccess,
    canSeeIsdResource,
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

    it('defines executive and team_lead for ISD NM', () => {
        expect(ROLES.EXECUTIVE).toBe('executive');
        expect(ROLES.TEAM_LEAD).toBe('team_lead');
    });

    it('keeps viewer as a legacy alias', () => {
        expect(ROLES.VIEWER).toBe('viewer');
    });
});

describe('role arrays', () => {
    it('ALL_ROLES includes admin, staff, viewer, executive, team_lead', () => {
        expect(ALL_ROLES).toContain('admin');
        expect(ALL_ROLES).toContain('staff');
        expect(ALL_ROLES).toContain('viewer');
        expect(ALL_ROLES).toContain('executive');
        expect(ALL_ROLES).toContain('team_lead');
    });

    it('ISD_NM_ROLES lists admins, executives, and team leads only', () => {
        expect(ISD_NM_ROLES).toEqual(['admin', 'executive', 'team_lead']);
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

    it('allows ISD NM to executives, team leads, and admins', () => {
        expect(routePermissions['/isd-nm']).toEqual(ISD_NM_ROLES);
    });
});

// ── Sidebar permissions ──────────────────────────────────

describe('sidebarPermissions', () => {
    it('mirrors route-level access for admin pages', () => {
        expect(sidebarPermissions['/admin']).toEqual(ADMIN_ONLY);
        expect(sidebarPermissions['/retail-admin']).toEqual(ADMIN_ONLY);
    });

    it('shows feedback department to admins and feedback users', () => {
        expect(sidebarPermissions['/feedback-department']).toEqual(FEEDBACK_DEPARTMENT_ROLES);
    });

    it('shows ISD NM only to ISD-eligible roles', () => {
        expect(sidebarPermissions['/isd-nm']).toEqual(ISD_NM_ROLES);
    });
});

// ── hasAccess ────────────────────────────────────────────

describe('canSeeIsdResource', () => {
    it('admins see every tier including admin-only links', () => {
        expect(canSeeIsdResource('admin', 'executive')).toBe(true);
        expect(canSeeIsdResource('admin', 'team_lead')).toBe(true);
        expect(canSeeIsdResource('admin', 'admin')).toBe(true);
    });

    it('executives only see executive tier', () => {
        expect(canSeeIsdResource('executive', 'executive')).toBe(true);
        expect(canSeeIsdResource('executive', 'team_lead')).toBe(false);
        expect(canSeeIsdResource('executive', 'admin')).toBe(false);
    });

    it('team leads see executive and team_lead tiers', () => {
        expect(canSeeIsdResource('team_lead', 'executive')).toBe(true);
        expect(canSeeIsdResource('team_lead', 'team_lead')).toBe(true);
        expect(canSeeIsdResource('team_lead', 'admin')).toBe(false);
    });
});

describe('hasAccess', () => {
    it('grants admin access to all routes', () => {
        expect(hasAccess('admin', '/admin')).toBe(true);
        expect(hasAccess('admin', '/retail-staff')).toBe(true);
        expect(hasAccess('admin', '/profile')).toBe(true);
        expect(hasAccess('admin', '/business-analytics')).toBe(true);
        expect(hasAccess('admin', '/feedback-department')).toBe(true);
        expect(hasAccess('admin', '/isd-nm')).toBe(true);
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

    it('denies staff access to ISD NM', () => {
        expect(hasAccess('staff', '/isd-nm')).toBe(false);
    });

    it('allows executive and team_lead access to ISD NM and retail-staff', () => {
        expect(hasAccess('executive', '/isd-nm')).toBe(true);
        expect(hasAccess('team_lead', '/isd-nm')).toBe(true);
        expect(hasAccess('executive', '/retail-staff')).toBe(true);
        expect(hasAccess('team_lead', '/retail-staff')).toBe(true);
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
        expect(hasAccess('feedback', '/isd-nm')).toBe(false);
    });
});
