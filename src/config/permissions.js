/**
 * RBAC Permissions Configuration
 * Maps route paths to allowed roles.
 * 
 * Roles hierarchy:
 *   admin   → All pages + Admin panel
 *   manager → All dashboard pages
 *   viewer  → Dashboard home + assigned pages only
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
    '/': ALL_ROLES,
    '/inside-sales-india': MANAGER_AND_ABOVE,
    '/inside-sales-middle-east': MANAGER_AND_ABOVE,
    '/experience-store': MANAGER_AND_ABOVE,
    '/retention-calling': MANAGER_AND_ABOVE,
    '/online-reputation-management': MANAGER_AND_ABOVE,
    '/feedback-customer-experience': MANAGER_AND_ABOVE,
    '/profile': ALL_ROLES,
    '/admin': ADMIN_ONLY,
    '/retail-admin': ALL_ROLES,
    '/business-analytics': ALL_ROLES,
};

/**
 * Sidebar nav items — each with role visibility.
 */
export const sidebarPermissions = {
    '/': ALL_ROLES,
    '/inside-sales-india': MANAGER_AND_ABOVE,
    '/inside-sales-middle-east': MANAGER_AND_ABOVE,
    '/experience-store': MANAGER_AND_ABOVE,
    '/retention-calling': MANAGER_AND_ABOVE,
    '/online-reputation-management': MANAGER_AND_ABOVE,
    '/feedback-customer-experience': MANAGER_AND_ABOVE,
    '/admin': ADMIN_ONLY,
    '/retail-admin': ALL_ROLES,
    '/business-analytics': ALL_ROLES,
};

/**
 * Check if a role has access to a given path.
 */
export function hasAccess(role, path) {
    const allowed = routePermissions[path];
    if (!allowed) return true; // Unlisted routes are open
    return allowed.includes(role);
}
