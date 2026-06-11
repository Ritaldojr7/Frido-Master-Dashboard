/**
 * RBAC Permissions Configuration
 * Maps route paths to allowed roles.
 *
 * Non-admin users may hold multiple roles (`user.roles` array).
 * Admin always has full access.
 *
 * Roles hierarchy:
 *   admin → Full product access including ISD NM (all link tiers), retail admin, analytics, feedback, user management
 *   staff → Retail staff and profile
 *   executive / team_lead → ISD NM only (role-filtered links) + profile
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

/** Retail – Staff dashboard: not available to ISD-only roles (executive / team_lead). */
export const RETAIL_STAFF_ACCESS_ROLES = [ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER];

/** ISD NM hub: executives, team leads, and admins */
export const ISD_NM_ROLES = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.TEAM_LEAD];

/** Who may open the Feedback Department page (admins retain full access). */
export const FEEDBACK_DEPARTMENT_ROLES = [ROLES.ADMIN, ROLES.FEEDBACK];

/** Order Dispute (Google Sheets) — adjust when rollout is defined. */
export const ORDER_DISPUTE_ROLES = [ROLES.ADMIN, ROLES.STAFF, ROLES.TEAM_LEAD, ROLES.EXECUTIVE];

/** Any authenticated dashboard role that may edit their profile. */
export const PROFILE_ROLES = [...ALL_ROLES, ROLES.FEEDBACK];

/**
 * @param {string | { role?: string, roles?: string[] } | null | undefined} userOrRole
 * @returns {string[]}
 */
export function getUserRoles(userOrRole) {
    if (userOrRole && typeof userOrRole === 'object' && !Array.isArray(userOrRole)) {
        if (Array.isArray(userOrRole.roles) && userOrRole.roles.length > 0) {
            return [...new Set(userOrRole.roles)];
        }
        if (userOrRole.role) {
            return [userOrRole.role];
        }
        return ['staff'];
    }
    if (typeof userOrRole === 'string' && userOrRole) {
        return [userOrRole];
    }
    return ['staff'];
}

/** Admin bypasses; otherwise any assigned role may match. */
export function hasAnyRole(userOrRole, allowedRoles) {
    const roles = getUserRoles(userOrRole);
    if (roles.includes(ROLES.ADMIN)) return true;
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
    return allowedRoles.some((r) => roles.includes(r));
}

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
    '/order-dispute': ORDER_DISPUTE_ROLES,
    '/retail-staff': RETAIL_STAFF_ACCESS_ROLES,
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
    '/order-dispute': ORDER_DISPUTE_ROLES,
    '/retail-staff': RETAIL_STAFF_ACCESS_ROLES,
    '/isd-nm': ISD_NM_ROLES,
};

/**
 * ISD NM link visibility by minimum role tier.
 * Uses the highest ISD role among the user's assigned roles.
 */
export function canSeeIsdResource(userOrRole, minRole) {
    const roles = getUserRoles(userOrRole);
    if (roles.includes(ROLES.ADMIN)) return true;
    if (minRole === ROLES.ADMIN) return false;
    const hasTeamLead = roles.includes(ROLES.TEAM_LEAD);
    const hasExecutive = roles.includes(ROLES.EXECUTIVE);
    if (minRole === ROLES.TEAM_LEAD) return hasTeamLead;
    if (minRole === ROLES.EXECUTIVE) return hasExecutive || hasTeamLead;
    return false;
}

/**
 * Check if a user has access to a given path.
 * @param {string | { role?: string, roles?: string[] }} userOrRole
 */
export function hasAccess(userOrRole, path) {
    const allowed = routePermissions[path];
    if (!allowed) return true;
    return hasAnyRole(userOrRole, allowed);
}

/** Primary home route from role priority (multi-role users). */
export function defaultHomePath(userOrRole) {
    const roles = getUserRoles(userOrRole);
    if (roles.includes(ROLES.ADMIN)) return '/admin';
    if (roles.includes(ROLES.FEEDBACK)) return '/feedback-department';
    if (roles.includes(ROLES.EXECUTIVE) || roles.includes(ROLES.TEAM_LEAD)) return '/isd-nm';
    return '/retail-staff';
}
