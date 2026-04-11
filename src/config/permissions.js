/**
 * RBAC Permissions Configuration
 * Maps route paths to allowed roles.
 *
 * Roles hierarchy:
 *   admin   → Retail admin, analytics, feedback department, user management
 *   manager → Same retail-staff visibility as viewer for listed routes
 *   viewer  → Retail - Staff and profile
 */

export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    VIEWER: 'viewer',
};

export const ALL_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.VIEWER];
export const MANAGER_AND_ABOVE = [ROLES.ADMIN, ROLES.MANAGER];
export const ADMIN_ONLY = [ROLES.ADMIN];

/**
 * Route-level permissions.
 * If a route is not listed here, it's accessible to all authenticated users.
 */
export const routePermissions = {
    '/profile': ALL_ROLES,
    '/admin': ADMIN_ONLY,
    '/retail-admin': ADMIN_ONLY,
    '/business-analytics': ADMIN_ONLY,
    '/feedback-department': ADMIN_ONLY,
    '/retail-staff': ALL_ROLES,
};

/**
 * Sidebar nav items — each with role visibility.
 */
export const sidebarPermissions = {
    '/admin': ADMIN_ONLY,
    '/retail-admin': ADMIN_ONLY,
    '/business-analytics': ADMIN_ONLY,
    '/feedback-department': ADMIN_ONLY,
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
