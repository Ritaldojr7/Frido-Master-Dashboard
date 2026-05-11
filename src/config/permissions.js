/**
 * RBAC Permissions Configuration
 * Maps route paths to allowed roles.
 *
 * Roles hierarchy:
 *   admin → Full product access including ISD NM (all link tiers), retail admin, analytics, feedback, user management
 *   staff → Retail staff and profile
 *   executive / team_lead → ISD NM (role-filtered links) + retail staff + profile
 *   feedback → Feedback department only (+ profile)
 *   viewer → Legacy alias (treated like staff for routes)
 */

export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    VIEWER: 'viewer', // legacy alias for older local/demo data
    FEEDBACK: 'feedback',
    EXECUTIVE: 'executive',
    TEAM_LEAD: 'team_lead',
};

export const ALL_ROLES = [ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER, ROLES.EXECUTIVE, ROLES.TEAM_LEAD];
export const ADMIN_ONLY = [ROLES.ADMIN];
export const STAFF_ONLY = [ROLES.STAFF, ROLES.VIEWER];

/** ISD NM hub: executives, team leads, and admins */
export const ISD_NM_ROLES = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.TEAM_LEAD];

/** Who may open the Feedback Department page (admins retain full access). */
export const FEEDBACK_DEPARTMENT_ROLES = [ROLES.ADMIN, ROLES.FEEDBACK];

/** Any authenticated dashboard role that may edit their profile. */
export const PROFILE_ROLES = [...ALL_ROLES, ROLES.FEEDBACK];

/**
 * Route-level permissions.
 * If a route is not listed here, it's accessible to all authenticated users.
 */
export const routePermissions = {
    '/profile': PROFILE_ROLES,
    '/admin': ADMIN_ONLY,
    '/retail-admin': ADMIN_ONLY,
    '/business-analytics': ADMIN_ONLY,
    '/feedback-department': FEEDBACK_DEPARTMENT_ROLES,
    '/retail-staff': ALL_ROLES,
    '/isd-nm': ISD_NM_ROLES,
};

/**
 * Sidebar nav items — each with role visibility.
 */
export const sidebarPermissions = {
    '/admin': ADMIN_ONLY,
    '/retail-admin': ADMIN_ONLY,
    '/business-analytics': ADMIN_ONLY,
    '/feedback-department': FEEDBACK_DEPARTMENT_ROLES,
    '/retail-staff': ALL_ROLES,
    '/isd-nm': ISD_NM_ROLES,
};

/**
 * ISD NM link visibility by minimum role tier.
 * admin: all links; team_lead: executive + team_lead tier; executive: executive tier only.
 * `minRole` values: 'executive' | 'team_lead' | 'admin'
 */
export function canSeeIsdResource(userRole, minRole) {
    if (userRole === ROLES.ADMIN) return true;
    if (minRole === ROLES.ADMIN) return false;
    if (minRole === ROLES.TEAM_LEAD) return userRole === ROLES.TEAM_LEAD;
    if (minRole === ROLES.EXECUTIVE) return userRole === ROLES.EXECUTIVE || userRole === ROLES.TEAM_LEAD;
    return false;
}

/**
 * Check if a role has access to a given path.
 */
export function hasAccess(role, path) {
    const allowed = routePermissions[path];
    if (!allowed) return true; // Unlisted routes are open
    return allowed.includes(role);
}
