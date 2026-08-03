/**
 * Unit tests for src/config/permissions.js
 * Validates role constants, route permissions, and access control logic.
 */
import { describe, it, expect } from 'vitest';
import {
    ROLES,
    ALL_ROLES,
    ADMIN_ONLY,
    BUSINESS_ANALYTICS_ROLES,
    STAFF_ONLY,
    FEEDBACK_DEPARTMENT_ROLES,
    PROFILE_ROLES,
    ISD_NM_ROLES,
    RETAIL_STAFF_ACCESS_ROLES,
    ORM_ROLES,
    ORM_ALLOWED_EMAILS,
    TD_ROLES,
    DAILY_INVENTORY_ROLES,
    MANPOWER_ROLES,
    routePermissions,
    sidebarPermissions,
    hasAccess,
    canSeeIsdResource,
    defaultHomePath,
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

    it('defines feedback and feedback_head roles', () => {
        expect(ROLES.FEEDBACK).toBe('feedback');
        expect(ROLES.FEEDBACK_HEAD).toBe('feedback_head');
    });

    it('defines executive and team_lead for ISD NM', () => {
        expect(ROLES.EXECUTIVE).toBe('executive');
        expect(ROLES.TEAM_LEAD).toBe('team_lead');
    });

    it('defines td_head for Training & Development', () => {
        expect(ROLES.TD_HEAD).toBe('td_head');
    });

    it('defines orm_lead for ORM', () => {
        expect(ROLES.ORM_LEAD).toBe('orm_lead');
    });
});

describe('role arrays', () => {
    it('ALL_ROLES includes all defined roles', () => {
        expect(ALL_ROLES).toContain('admin');
        expect(ALL_ROLES).toContain('staff');
        expect(ALL_ROLES).toContain('feedback');
        expect(ALL_ROLES).toContain('feedback_head');
        expect(ALL_ROLES).toContain('executive');
        expect(ALL_ROLES).toContain('team_lead');
        expect(ALL_ROLES).toContain('data_analyst');
        expect(ALL_ROLES).toContain('orm_lead');
        expect(ALL_ROLES).toContain('td_head');
        expect(ALL_ROLES).not.toContain('viewer');
    });

    it('ISD_NM_ROLES lists admins, executives, team leads', () => {
        expect(ISD_NM_ROLES).toEqual(['admin', 'executive', 'team_lead']);
    });

    it('RETAIL_STAFF_ACCESS_ROLES excludes ISD-only roles', () => {
        expect(RETAIL_STAFF_ACCESS_ROLES).toEqual(['admin', 'staff']);
        expect(RETAIL_STAFF_ACCESS_ROLES).not.toContain('executive');
        expect(RETAIL_STAFF_ACCESS_ROLES).not.toContain('team_lead');
    });

    it('ADMIN_ONLY contains only admin', () => {
        expect(ADMIN_ONLY).toEqual(['admin']);
    });

    it('STAFF_ONLY does not include admin', () => {
        expect(STAFF_ONLY).not.toContain('admin');
        expect(STAFF_ONLY).toContain('staff');
    });

    it('FEEDBACK_DEPARTMENT_ROLES includes admin and feedback_head only', () => {
        expect(FEEDBACK_DEPARTMENT_ROLES).toEqual(['admin', 'feedback_head']);
        expect(FEEDBACK_DEPARTMENT_ROLES).not.toContain('feedback');
        expect(FEEDBACK_DEPARTMENT_ROLES).not.toContain('data_analyst');
    });

    it('TD_ROLES includes admin and td_head', () => {
        expect(TD_ROLES).toEqual(['admin', 'td_head']);
    });

    it('ORM_ROLES includes admin and orm_lead only', () => {
        expect(ORM_ROLES).toEqual(['admin', 'orm_lead']);
        expect(ORM_ROLES).not.toContain('data_analyst');
    });

    it('BUSINESS_ANALYTICS_ROLES is admin only', () => {
        expect(BUSINESS_ANALYTICS_ROLES).toEqual(ADMIN_ONLY);
    });

    it('DAILY_INVENTORY_ROLES includes admin, executive, team_lead', () => {
        expect(DAILY_INVENTORY_ROLES).toEqual(['admin', 'executive', 'team_lead']);
    });

    it('MANPOWER_ROLES includes admin and team_lead only', () => {
        expect(MANPOWER_ROLES).toEqual(['admin', 'team_lead']);
    });
});

// ── Route permissions ────────────────────────────────────

describe('routePermissions', () => {
    it('locks admin page to admins', () => {
        expect(routePermissions['/admin']).toEqual(ADMIN_ONLY);
    });

    it('allows admin and staff on retail-staff (not executive / team_lead)', () => {
        expect(routePermissions['/retail-staff']).toEqual(RETAIL_STAFF_ACCESS_ROLES);
    });

    it('allows all roles to access profile', () => {
        expect(routePermissions['/profile']).toEqual(PROFILE_ROLES);
    });

    it('locks business analytics to admins only', () => {
        expect(routePermissions['/business-analytics']).toEqual(ADMIN_ONLY);
    });

    it('allows ISD NM to executives, team leads, and admins', () => {
        expect(routePermissions['/isd-nm']).toEqual(ISD_NM_ROLES);
    });

    it('locks ISD sub-dashboards to admins only', () => {
        expect(routePermissions['/isd/executive-performance']).toEqual(ADMIN_ONLY);
        expect(routePermissions['/isd/performance-profitability']).toEqual(ADMIN_ONLY);
        expect(routePermissions['/isd/salary-analysis']).toEqual(ADMIN_ONLY);
    });

    it('locks training & development to admin and td_head', () => {
        expect(routePermissions['/lms-dashboard']).toEqual(TD_ROLES);
        expect(routePermissions['https://academy.myfrido.com/login']).toEqual(TD_ROLES);
    });

    it('does not include store analytics console', () => {
        expect(routePermissions).not.toHaveProperty('/retail-staff/analytics-console');
    });

    it('locks DOP/ReferRush to admins only', () => {
        expect(routePermissions['https://www.referrush.com/myfrido/dashboard']).toEqual(ADMIN_ONLY);
    });
});

// ── Sidebar permissions ──────────────────────────────────

describe('sidebarPermissions', () => {
    it('mirrors route-level access for admin pages', () => {
        expect(sidebarPermissions['/admin']).toEqual(ADMIN_ONLY);
        expect(sidebarPermissions['/retail-admin']).toEqual(ADMIN_ONLY);
    });

    it('shows retail-staff only to admin and staff', () => {
        expect(sidebarPermissions['/retail-staff']).toEqual(RETAIL_STAFF_ACCESS_ROLES);
    });

    it('shows feedback department to admins and feedback_head', () => {
        expect(sidebarPermissions['/feedback-department']).toEqual(FEEDBACK_DEPARTMENT_ROLES);
    });

    it('shows ISD NM only to ISD-eligible roles', () => {
        expect(sidebarPermissions['/isd-nm']).toEqual(ISD_NM_ROLES);
    });
});

// ── canSeeIsdResource ────────────────────────────────────

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

// ── hasAccess ────────────────────────────────────────────

describe('hasAccess', () => {
    it('grants admin access to all routes', () => {
        expect(hasAccess('admin', '/admin')).toBe(true);
        expect(hasAccess('admin', '/retail-staff')).toBe(true);
        expect(hasAccess('admin', '/profile')).toBe(true);
        expect(hasAccess('admin', '/business-analytics')).toBe(true);
        expect(hasAccess('admin', '/feedback-department')).toBe(true);
        expect(hasAccess('admin', '/isd-nm')).toBe(true);
        expect(hasAccess('admin', '/isd/executive-performance')).toBe(true);
        expect(hasAccess('admin', '/isd/salary-analysis')).toBe(true);
        expect(hasAccess('admin', '/orm')).toBe(true);
    });

    it('restricts ISD sub-dashboards to admins only', () => {
        expect(hasAccess('admin', '/isd/executive-performance')).toBe(true);
        expect(hasAccess('admin', '/isd/performance-profitability')).toBe(true);
        expect(hasAccess('admin', '/isd/salary-analysis')).toBe(true);

        expect(hasAccess('data_analyst', '/isd/executive-performance')).toBe(false);
        expect(hasAccess('executive', '/isd/executive-performance')).toBe(false);
        expect(hasAccess('team_lead', '/isd/salary-analysis')).toBe(false);
        expect(hasAccess('staff', '/isd/salary-analysis')).toBe(false);
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

    it('allows executive and team_lead access to ISD NM but not retail-staff', () => {
        expect(hasAccess('executive', '/isd-nm')).toBe(true);
        expect(hasAccess('team_lead', '/isd-nm')).toBe(true);
        expect(hasAccess('executive', '/retail-staff')).toBe(false);
        expect(hasAccess('team_lead', '/retail-staff')).toBe(false);
    });

    it('allows executive and team_lead access to daily inventory', () => {
        expect(hasAccess('executive', '/daily-inventory')).toBe(true);
        expect(hasAccess('team_lead', '/daily-inventory')).toBe(true);
    });

    it('allows team_lead access to manpower but not executive', () => {
        expect(hasAccess('team_lead', '/manpower')).toBe(true);
        expect(hasAccess('executive', '/manpower')).toBe(false);
    });

    it('denies executive/team_lead access to ISD sub-dashboards', () => {
        expect(hasAccess('executive', '/isd/executive-performance')).toBe(false);
        expect(hasAccess('team_lead', '/isd/performance-profitability')).toBe(false);
        expect(hasAccess('executive', '/isd/salary-analysis')).toBe(false);
    });

    it('returns true for unlisted routes (open by default)', () => {
        expect(hasAccess('staff', '/some-unknown-page')).toBe(true);
        expect(hasAccess('admin', '/some-unknown-page')).toBe(true);
    });

    it('allows feedback_head access to feedback routes', () => {
        expect(hasAccess('feedback_head', '/feedback-department')).toBe(true);
        expect(hasAccess('feedback_head', '/ai-calling-feedback')).toBe(true);
        expect(hasAccess('feedback_head', '/retail-feedback')).toBe(true);
        expect(hasAccess('feedback_head', '/profile')).toBe(true);
    });

    it('denies old feedback role access to feedback routes', () => {
        expect(hasAccess('feedback', '/feedback-department')).toBe(false);
        expect(hasAccess('feedback', '/admin')).toBe(false);
        expect(hasAccess('feedback', '/isd-nm')).toBe(false);
    });

    it('allows td_head access to LMS routes', () => {
        expect(hasAccess('td_head', '/lms-dashboard')).toBe(true);
        expect(hasAccess('td_head', '/profile')).toBe(true);
        // td_head should not have access to other sections
        expect(hasAccess('td_head', '/admin')).toBe(false);
        expect(hasAccess('td_head', '/business-analytics')).toBe(false);
        expect(hasAccess('td_head', '/isd-nm')).toBe(false);
    });

    it('allows orm_lead access to ORM routes', () => {
        expect(hasAccess('orm_lead', '/orm')).toBe(true);
        expect(hasAccess('orm_lead', '/admin')).toBe(false);
    });

    it('allows harshika.s@myfrido.com access to ORM regardless of role', () => {
        expect(hasAccess({ email: 'harshika.s@myfrido.com', role: 'staff', roles: ['staff'] }, '/orm')).toBe(true);
        expect(hasAccess({ email: 'harshika.s@myfrido.com', role: 'feedback', roles: ['feedback'] }, '/orm')).toBe(true);
    });

    it('denies other non-ORM users access to ORM', () => {
        expect(hasAccess('staff', '/orm')).toBe(false);
        expect(hasAccess('data_analyst', '/orm')).toBe(false);
        expect(hasAccess({ email: 'random@myfrido.com', role: 'staff', roles: ['staff'] }, '/orm')).toBe(false);
    });

    it('denies data_analyst access to analytics sections (now admin-only)', () => {
        expect(hasAccess('data_analyst', '/business-analytics')).toBe(false);
        expect(hasAccess('data_analyst', '/isd/executive-performance')).toBe(false);
    });
});

describe('defaultHomePath', () => {
    it('routes bob@test.myfrido.com to Business Analytics', () => {
        expect(
            defaultHomePath({ email: 'bob@test.myfrido.com', role: 'admin', roles: ['admin'] })
        ).toBe('/business-analytics');
    });

    it('routes eve@test.myfrido.com to Feedback', () => {
        expect(
            defaultHomePath({ email: 'eve@test.myfrido.com', role: 'feedback', roles: ['feedback'] })
        ).toBe('/feedback-department');
    });

    it('routes other admins to Admin', () => {
        expect(defaultHomePath({ email: 'admin@myfrido.com', role: 'admin', roles: ['admin'] })).toBe(
            '/admin'
        );
    });

    it('routes executives and team leads to ISD NM', () => {
        expect(defaultHomePath({ role: 'executive', roles: ['executive'] })).toBe('/isd-nm');
        expect(defaultHomePath({ role: 'team_lead', roles: ['team_lead'] })).toBe('/isd-nm');
    });

    it('routes feedback_head to Feedback Department', () => {
        expect(defaultHomePath({ role: 'feedback_head', roles: ['feedback_head'] })).toBe('/feedback-department');
    });

    it('routes td_head to LMS Dashboard', () => {
        expect(defaultHomePath({ role: 'td_head', roles: ['td_head'] })).toBe('/lms-dashboard');
    });

    it('routes feedback users to Feedback Department', () => {
        expect(defaultHomePath({ role: 'feedback', roles: ['feedback'] })).toBe('/feedback-department');
    });

    it('routes retail staff to Retail Staff', () => {
        expect(defaultHomePath({ role: 'staff', roles: ['staff'] })).toBe('/retail-staff');
    });

    it('routes data analysts to Business Analytics', () => {
        expect(defaultHomePath({ role: 'data_analyst', roles: ['data_analyst'] })).toBe('/business-analytics');
    });

    it('routes orm leads to ORM', () => {
        expect(defaultHomePath({ role: 'orm_lead', roles: ['orm_lead'] })).toBe('/orm');
    });

    it('denies sounak.c@myfrido.com access to salary analysis even with admin role, but allows other admin routes', () => {
        const sounakAdmin = { email: 'sounak.c@myfrido.com', role: 'admin', roles: ['admin'] };
        expect(hasAccess(sounakAdmin, '/isd/salary-analysis')).toBe(false);
        expect(hasAccess(sounakAdmin, '/salary-analysis/index.html')).toBe(false);
        expect(hasAccess(sounakAdmin, '/admin')).toBe(true);
        expect(hasAccess(sounakAdmin, '/business-analytics')).toBe(true);
        expect(hasAccess(sounakAdmin, '/isd/executive-performance')).toBe(true);
        expect(hasAccess(sounakAdmin, '/isd-nm')).toBe(true);
    });
});
