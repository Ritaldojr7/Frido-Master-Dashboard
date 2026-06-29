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
 *   data_analyst → Business Analytics (+ profile)
 *   viewer → Legacy alias (treated like staff for routes)
 */

export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    FEEDBACK: 'feedback',
    EXECUTIVE: 'executive',
    TEAM_LEAD: 'team_lead',
    DATA_ANALYST: 'data_analyst',
};

export const ALL_ROLES = [ROLES.ADMIN, ROLES.STAFF, ROLES.FEEDBACK, ROLES.EXECUTIVE, ROLES.TEAM_LEAD, ROLES.DATA_ANALYST];
export const ADMIN_ONLY = [ROLES.ADMIN];
export const BUSINESS_ANALYTICS_ROLES = [ROLES.ADMIN, ROLES.DATA_ANALYST];
export const STAFF_ONLY = [ROLES.STAFF];

/** Retail – Staff dashboard: staff and admins. */
export const RETAIL_STAFF_ACCESS_ROLES = [ROLES.ADMIN, ROLES.STAFF];

/** ISD NM hub: executives, team leads, and admins */
export const ISD_NM_ROLES = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.TEAM_LEAD];

/** Who may open the Feedback Department page (admins retain full access). */
export const FEEDBACK_DEPARTMENT_ROLES = [ROLES.ADMIN, ROLES.FEEDBACK, ROLES.DATA_ANALYST];

/** Order Dispute (Google Sheets) — only admin */
export const ORDER_DISPUTE_ROLES = [ROLES.ADMIN];

/** AI Calling (Feedback) — same access as Feedback Department. */
export const AI_CALLING_FEEDBACK_ROLES = FEEDBACK_DEPARTMENT_ROLES;

/** ISD sub-dashboards — Executive Performance and Performance Profitability. */
export const ISD_EXEC_PERF_ROLES = [ROLES.ADMIN, ROLES.DATA_ANALYST];
export const ISD_PROFITABILITY_ROLES = [ROLES.ADMIN, ROLES.DATA_ANALYST];

/** ORM — blank placeholder for now, admin and data_analyst. */
export const ORM_ROLES = [ROLES.ADMIN, ROLES.DATA_ANALYST];

/** Any authenticated dashboard role that may edit their profile. */
export const PROFILE_ROLES = [...ALL_ROLES];

/** Users allowed to access the ISD dashboards (Executive Performance, Performance & Profitability, Salary Analysis). Strictly limited to these emails. */
export const ISD_DASHBOARD_EMAILS = [
    'ritwik.m@myfrido.com',
    'saiyed.a@myfrido.com',
    'juned.m@myfrido.com'
];

export const SALARY_ANALYSIS_EMAILS = ISD_DASHBOARD_EMAILS;

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
    '/business-analytics': BUSINESS_ANALYTICS_ROLES,
    'https://dashboard.tangoeye.ai': BUSINESS_ANALYTICS_ROLES,
    'https://pilot.goyoyo.ai': BUSINESS_ANALYTICS_ROLES,
    'https://docs.google.com/spreadsheets/d/1vDtjeVr60T3zQvFovHXMz6km_H46YkL91_C45SeiQAk': BUSINESS_ANALYTICS_ROLES,
    'https://docs.google.com/spreadsheets/d/13nrONpvuSQ1_OpEHhsY44p-k2TqfC_jFZjXvGVLoFlA': BUSINESS_ANALYTICS_ROLES,
    'https://darling-pithivier-0b906d.netlify.app': BUSINESS_ANALYTICS_ROLES,
    'https://illustrious-bubblegum-509fc4.netlify.app': BUSINESS_ANALYTICS_ROLES,
    'https://analytics-dashboard-frontend-x2da.onrender.com': BUSINESS_ANALYTICS_ROLES,
    'https://discount-manager-frontend.onrender.com': BUSINESS_ANALYTICS_ROLES,
    'https://cx.locobuzz.com': ORM_ROLES,
    'https://docs.google.com/spreadsheets/d/1_CT5fe9uI6VjJSx685RX3fEDTVVy0nRBMxXyhRMBo6I': ADMIN_ONLY,
    'https://whimsical.com/PCns3cFh6JdKE69XtYkenY': ADMIN_ONLY,
    'https://employee.dice.tech/': ADMIN_ONLY,
    '/training-portal': ADMIN_ONLY,
    '/expense-tracker': ADMIN_ONLY,
    '/feedback-department': FEEDBACK_DEPARTMENT_ROLES,
    '/ai-calling-feedback': AI_CALLING_FEEDBACK_ROLES,
    '/order-dispute': ORDER_DISPUTE_ROLES,
    '/retail-staff': RETAIL_STAFF_ACCESS_ROLES,
    '/isd-nm': ISD_NM_ROLES,
    '/isd/executive-performance': ISD_EXEC_PERF_ROLES,
    '/isd/performance-profitability': ISD_PROFITABILITY_ROLES,
    '/isd/salary-analysis': [], // Strict email check handles this, empty role list fallback
    '/orm': ORM_ROLES,
    'https://www.referrush.com/myfrido/dashboard': ADMIN_ONLY,
};

/**
 * Sidebar nav items — each with role visibility.
 */
export const sidebarPermissions = { ...routePermissions };

/**
 * ISD NM link visibility by minimum role tier.
 * Uses the highest ISD role among the user's assigned roles.
 */
export function canSeeIsdResource(userOrRole, minRole) {
    const roles = getUserRoles(userOrRole);
    if (roles.includes(ROLES.ADMIN) || roles.includes(ROLES.DATA_ANALYST)) return true;
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
    if (!path) return true;
    
    // Normalize path: strip query/hash and trailing slashes
    const cleanPath = String(path).trim().split(/[?#]/)[0].replace(/\/+$/, '');

    // Strictly check ISD dashboards email list (Executive Performance, Performance & Profitability, Salary Analysis)
    const isIsdDashboard = cleanPath === '/isd/salary-analysis' ||
                           cleanPath === '/isd/executive-performance' ||
                           cleanPath === '/isd/performance-profitability';

    if (isIsdDashboard) {
        if (!userOrRole || typeof userOrRole !== 'object') return false;
        const email = String(userOrRole.email || '').trim().toLowerCase();
        return ISD_DASHBOARD_EMAILS.map(e => e.toLowerCase()).includes(email);
    }

    // 1. Direct match (original path or clean normalized path)
    let allowed = routePermissions[path] || routePermissions[cleanPath];

    // 2. Prefix match for external/dynamic URLs
    if (!allowed) {
        const matchingKey = Object.keys(routePermissions).find((key) => {
            if (key === '/' || !key) return false;
            // E.g. cleanPath "https://dashboard.tangoeye.ai/auth/login" starts with "https://dashboard.tangoeye.ai"
            return cleanPath.startsWith(key.replace(/\/+$/, ''));
        });
        if (matchingKey) {
            allowed = routePermissions[matchingKey];
        }
    }

    if (!allowed) return true;
    return hasAnyRole(userOrRole, allowed);
}

/** Per-user landing page overrides (email → path). Checked before role-based defaults. */
const HOME_PATH_BY_EMAIL = {
    'saiyed.a@myfrido.com': '/business-analytics',
    'rhythm.j@myfrido.com': '/feedback-department',
};

/** Primary home route from role priority (multi-role users). */
export function defaultHomePath(userOrRole) {
    if (userOrRole && typeof userOrRole === 'object' && userOrRole.email) {
        const emailOverride = HOME_PATH_BY_EMAIL[String(userOrRole.email).trim().toLowerCase()];
        if (emailOverride) return emailOverride;
    }

    const roles = getUserRoles(userOrRole);
    if (roles.includes(ROLES.ADMIN)) return '/admin';
    if (roles.includes(ROLES.DATA_ANALYST)) return '/business-analytics';
    if (roles.includes(ROLES.EXECUTIVE) || roles.includes(ROLES.TEAM_LEAD)) return '/isd-nm';
    if (roles.includes(ROLES.FEEDBACK)) return '/feedback-department';
    if (roles.includes(ROLES.STAFF)) return '/retail-staff';
    return '/retail-staff';
}
