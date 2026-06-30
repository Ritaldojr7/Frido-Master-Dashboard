/**
 * Multi-role helpers — non-admin users may hold multiple roles.
 * `users.role` remains the primary role for backward compatibility.
 * `users.roles` stores a JSON array of role slugs.
 */
import { resolveRoleToValidSlug, VALID_ROLES } from './security.js';

const PRIMARY_ROLE_ORDER = ['admin', 'data_analyst', 'feedback', 'executive', 'team_lead', 'orm_lead', 'staff'];

/** @param {unknown} rolesJson */
export function parseRolesFromStorage(rolesJson, fallbackRole) {
    if (rolesJson != null && String(rolesJson).trim() !== '' && rolesJson !== '[]') {
        try {
            const parsed = typeof rolesJson === 'string' ? JSON.parse(rolesJson) : rolesJson;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return normalizeRolesArray(parsed);
            }
        } catch {
            /* fall through to legacy role column */
        }
    }
    if (fallbackRole) {
        return normalizeRolesArray([fallbackRole]);
    }
    return ['staff'];
}

/** @param {unknown} input */
export function normalizeRolesArray(input) {
    const list = Array.isArray(input) ? input : input != null ? [input] : [];
    const out = [];
    for (const item of list) {
        const slug = resolveRoleToValidSlug(item) ?? (VALID_ROLES.includes(String(item)) ? String(item) : null);
        if (slug && !out.includes(slug)) {
            out.push(slug);
        }
    }
    if (out.includes('admin')) {
        return ['admin'];
    }
    return out.length > 0 ? out : ['staff'];
}

/** @param {string[]} roles */
export function primaryRoleFromRoles(roles) {
    const normalized = normalizeRolesArray(roles);
    for (const preferred of PRIMARY_ROLE_ORDER) {
        if (normalized.includes(preferred)) {
            return preferred;
        }
    }
    return normalized[0] || 'staff';
}

/** @param {unknown} rolesInput */
export function rolesToDbColumns(rolesInput) {
    const roles = normalizeRolesArray(rolesInput);
    return {
        roles: JSON.stringify(roles),
        role: primaryRoleFromRoles(roles),
    };
}

/**
 * @param {{ roles?: unknown, role?: string }} body
 * @returns {string[] | null}
 */
export function parseRolesFromRequest(body) {
    if (!body || typeof body !== 'object') return null;
    if (Array.isArray(body.roles)) {
        return normalizeRolesArray(body.roles);
    }
    if (typeof body.roles === 'string' && body.roles.trim()) {
        return normalizeRolesArray(
            body.roles
                .split(/[,;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
        );
    }
    if (body.role) {
        return normalizeRolesArray([body.role]);
    }
    return null;
}

/** @param {unknown} roleRaw */
export function parseRolesFromImportString(roleRaw) {
    if (roleRaw == null || String(roleRaw).trim() === '') return null;
    const raw = String(roleRaw).trim();
    if (/[,;]/.test(raw)) {
        return normalizeRolesArray(
            raw
                .split(/[,;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
        );
    }
    const slug = resolveRoleToValidSlug(raw);
    return slug ? [slug] : null;
}

/** @param {string[] | { roles?: string[], role?: string }} userOrRoles */
export function getUserRoles(userOrRoles) {
    if (Array.isArray(userOrRoles)) {
        return normalizeRolesArray(userOrRoles);
    }
    if (userOrRoles && Array.isArray(userOrRoles.roles) && userOrRoles.roles.length > 0) {
        return normalizeRolesArray(userOrRoles.roles);
    }
    return parseRolesFromStorage(userOrRoles?.roles, userOrRoles?.role);
}

/** Admin bypasses all role checks. */
export function hasAnyRole(userOrRoles, allowedRoles) {
    const roles = getUserRoles(userOrRoles);
    if (roles.includes('admin')) return true;
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true;
    return allowedRoles.some((r) => roles.includes(r));
}

/** Highest ISD tier among assigned roles (team_lead > executive). */
export function highestIsdRole(userOrRoles) {
    const roles = getUserRoles(userOrRoles);
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('team_lead')) return 'team_lead';
    if (roles.includes('executive')) return 'executive';
    return null;
}

/** @param {Record<string, unknown> | null | undefined} row */
export function formatUserRow(row) {
    if (!row) return null;
    const roles = parseRolesFromStorage(row.roles, row.role);
    return {
        ...row,
        roles,
        role: primaryRoleFromRoles(roles),
    };
}

/** Roles assignable together (excludes admin unless sole role). */
export const NON_ADMIN_ASSIGNABLE_ROLES = VALID_ROLES.filter((r) => r !== 'admin');
