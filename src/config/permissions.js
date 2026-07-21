/**
 * RBAC Permissions Configuration
 * Maps route paths to allowed roles.
 *
 * Non-admin users may hold multiple roles (`user.roles` array).
 * Admin always has full access.
 *
 * Roles hierarchy:
 *   admin        → Full product access including user management, all dashboards, analytics
 *   staff        → Retail Staff Portal and profile
 *   executive    → ISD NM Staff + Daily Inventory (view only) + profile
 *   team_lead    → ISD NM Staff + Manpower Attendance + Daily Inventory (view only) + profile
 *   feedback_head→ Feedback section (Feedback Dashboard, AI Calling, Retail Feedback) + profile
 *   td_head      → Training & Development (LMS) + profile
 *   data_analyst → Profile only (legacy — no direct section access)
 *   orm_lead     → ORM section + profile
 *   feedback     → Legacy alias (kept for backward compatibility)
 */

export const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    FEEDBACK: 'feedback',
    FEEDBACK_HEAD: 'feedback_head',
    EXECUTIVE: 'executive',
    TEAM_LEAD: 'team_lead',
    DATA_ANALYST: 'data_analyst',
    ORM_LEAD: 'orm_lead',
    TD_HEAD: 'td_head',
};

import {
    getHomePathByEmail,
    getIsdDashboardEmails,
    getSalaryAnalysisEmails,
    getStoreEmailMap,
} from './organizationConfig.js';

export {
    getStoreEmailMap as STORE_EMAIL_MAP,
    getIsdDashboardEmails as ISD_DASHBOARD_EMAILS,
    getSalaryAnalysisEmails as SALARY_ANALYSIS_EMAILS,
};

export const ALL_ROLES = [
    ROLES.ADMIN, ROLES.STAFF, ROLES.FEEDBACK, ROLES.FEEDBACK_HEAD,
    ROLES.EXECUTIVE, ROLES.TEAM_LEAD, ROLES.DATA_ANALYST, ROLES.ORM_LEAD, ROLES.TD_HEAD,
];
export const ADMIN_ONLY = [ROLES.ADMIN];
export const STAFF_ONLY = [ROLES.STAFF];

/** Retail – Staff dashboard: staff and admins. */
export const RETAIL_STAFF_ACCESS_ROLES = [ROLES.ADMIN, ROLES.STAFF];

/** ISD NM hub: executives, team leads, and admins */
export const ISD_NM_ROLES = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.TEAM_LEAD];

/**
 * Daily Inventory dashboard — executives, team leads and admins may view.
 * Uploading is a separate, narrower right enforced server-side against a named
 * email allowlist (INVENTORY_UPLOADER_EMAILS), not by role.
 */
export const DAILY_INVENTORY_ROLES = [ROLES.ADMIN, ROLES.EXECUTIVE, ROLES.TEAM_LEAD];

/** Manpower Attendance & Performance dashboard: admins and team leads */
export const MANPOWER_ROLES = [ROLES.ADMIN, ROLES.TEAM_LEAD];

/** Feedback section: admins and feedback_head only. */
export const FEEDBACK_DEPARTMENT_ROLES = [ROLES.ADMIN, ROLES.FEEDBACK_HEAD];

/** Order Dispute — only admin */
export const ORDER_DISPUTE_ROLES = [ROLES.ADMIN];

/** AI Calling (Feedback) — same access as Feedback Department. */
export const AI_CALLING_FEEDBACK_ROLES = FEEDBACK_DEPARTMENT_ROLES;

/** ISD sub-dashboards — admin only. */
export const ISD_EXEC_PERF_ROLES = ADMIN_ONLY;
export const ISD_PROFITABILITY_ROLES = ADMIN_ONLY;

/** Training & Development — admin and td_head. */
export const TD_ROLES = [ROLES.ADMIN, ROLES.TD_HEAD];

/** ORM — admin, orm_lead, and specific email (harshika.s@myfrido.com). */
export const ORM_ROLES = [ROLES.ADMIN, ROLES.ORM_LEAD];

/** ORM additional email allowlist — users with these emails can also access ORM regardless of role. */
export const ORM_ALLOWED_EMAILS = ['harshika.s@myfrido.com'];

/** Business Analytics / Data & Analytics — admin only. */
export const BUSINESS_ANALYTICS_ROLES = ADMIN_ONLY;

/** Any authenticated dashboard role that may edit their profile. */
export const PROFILE_ROLES = [...ALL_ROLES];

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

    // ── User Management ──
    '/admin': ADMIN_ONLY,

    // ── ISD Team & Bandwidth (whole section) — admin only ──
    'https://docs.google.com/spreadsheets/d/1_CT5fe9uI6VjJSx685RX3fEDTVVy0nRBMxXyhRMBo6I': ADMIN_ONLY,
    'https://whimsical.com/PCns3cFh6JdKE69XtYkenY': ADMIN_ONLY,
    'https://employee.dice.tech/': ADMIN_ONLY,
    '/expense-tracker': ADMIN_ONLY,

    // ── Training & Development — admin + td_head ──
    '/lms-dashboard': TD_ROLES,
    'https://academy.myfrido.com/login': TD_ROLES,

    // ── Analytics > Data & Analytics — admin only ──
    '/business-analytics': ADMIN_ONLY,
    'https://analytics-dashboard-frontend-x2da.onrender.com': ADMIN_ONLY,
    'https://discount-manager-frontend.onrender.com': ADMIN_ONLY,

    // ── Analytics > ISD ──
    '/isd/executive-performance': ADMIN_ONLY,
    '/isd/performance-profitability': ADMIN_ONLY,
    '/isd/salary-analysis': ADMIN_ONLY,
    '/manpower': MANPOWER_ROLES,
    '/daily-inventory': DAILY_INVENTORY_ROLES,

    // ── Analytics > Retail Analytics (whole section) — admin only ──
    'https://dashboard.tangoeye.ai': ADMIN_ONLY,
    'https://pilot.goyoyo.ai': ADMIN_ONLY,
    'https://docs.google.com/spreadsheets/d/1vDtjeVr60T3zQvFovHXMz6km_H46YkL91_C45SeiQAk': ADMIN_ONLY,
    'https://docs.google.com/spreadsheets/d/13nrONpvuSQ1_OpEHhsY44p-k2TqfC_jFZjXvGVLoFlA': ADMIN_ONLY,
    'https://darling-pithivier-0b906d.netlify.app': ADMIN_ONLY,
    'https://illustrious-bubblegum-509fc4.netlify.app': ADMIN_ONLY,
    'https://claude.ai/public/artifacts/ff06101d-6b15-4dce-95e5-6ec8d7871419': ADMIN_ONLY,

    // ── Analytics > Feedback — admin + feedback_head ──
    '/feedback-department': FEEDBACK_DEPARTMENT_ROLES,
    '/ai-calling-feedback': AI_CALLING_FEEDBACK_ROLES,
    '/retail-feedback': FEEDBACK_DEPARTMENT_ROLES,

    // ── Analytics > ORM — admin + orm_lead (+ email check in hasAccess) ──
    '/orm': ORM_ROLES,
    'https://cx.locobuzz.com': ORM_ROLES,
    'https://harshikamyfrido-prog.github.io/ORM-Dashboard/': ORM_ROLES,

    // ── DOP (whole section) — admin only ──
    'https://www.referrush.com/myfrido/dashboard': ADMIN_ONLY,

    // ── Aggregator ──
    '/retail-staff': RETAIL_STAFF_ACCESS_ROLES,
    '/retail-admin': ADMIN_ONLY,
    '/isd-nm': ISD_NM_ROLES,

    // ── Others ──
    '/order-dispute': ORDER_DISPUTE_ROLES,
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
    if (!path) return true;
    
    // Normalize path: strip query/hash and trailing slashes
    const cleanPath = String(path).trim().split(/[?#]/)[0].replace(/\/+$/, '');

    // ── ORM: role check OR email allowlist ──
    const isOrmPath = cleanPath === '/orm' || cleanPath.startsWith('https://cx.locobuzz.com');
    if (isOrmPath) {
        if (hasAnyRole(userOrRole, ORM_ROLES)) return true;
        // Allow specific email(s) regardless of role
        if (userOrRole && typeof userOrRole === 'object') {
            const email = String(userOrRole.email || '').trim().toLowerCase();
            if (ORM_ALLOWED_EMAILS.includes(email)) return true;
        }
        return false;
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

/** Primary home route from role priority (multi-role users). */
export function defaultHomePath(userOrRole) {
    if (userOrRole && typeof userOrRole === 'object' && userOrRole.email) {
        const emailOverride = getHomePathByEmail()[String(userOrRole.email).trim().toLowerCase()];
        if (emailOverride) return emailOverride;
    }

    const roles = getUserRoles(userOrRole);
    if (roles.includes(ROLES.ADMIN)) return '/admin';
    if (roles.includes(ROLES.EXECUTIVE) || roles.includes(ROLES.TEAM_LEAD)) return '/isd-nm';
    if (roles.includes(ROLES.FEEDBACK_HEAD)) return '/feedback-department';
    if (roles.includes(ROLES.TD_HEAD)) return '/lms-dashboard';
    if (roles.includes(ROLES.ORM_LEAD)) return '/orm';
    if (roles.includes(ROLES.DATA_ANALYST)) return '/business-analytics';
    if (roles.includes(ROLES.FEEDBACK)) return '/feedback-department';
    if (roles.includes(ROLES.STAFF)) return '/retail-staff';
    return '/retail-staff';
}
