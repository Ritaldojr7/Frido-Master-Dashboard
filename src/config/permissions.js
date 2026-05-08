/**
 * RBAC Permissions Configuration
 * Maps route paths to allowed roles.
 *
 * Roles hierarchy:
 *   admin → Retail admin, analytics, feedback department, user management, notices
 *   staff → Retail staff and profile
 *   feedback → Feedback department only (+ profile)
 *   viewer → Legacy alias (treated like staff for routes)
 */

export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    VIEWER: 'viewer', // legacy alias for older local/demo data
    FEEDBACK: 'feedback',
};

export const ALL_ROLES = [ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER];
export const ADMIN_ONLY = [ROLES.ADMIN];
export const STAFF_ONLY = [ROLES.STAFF, ROLES.VIEWER];

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
};

/**
 * Check if a role has access to a given path.
 */
export function hasAccess(role, path) {
    const allowed = routePermissions[path];
    if (!allowed) return true; // Unlisted routes are open
    return allowed.includes(role);
}
