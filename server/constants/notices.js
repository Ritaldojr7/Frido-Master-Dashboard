import { getUserRoles } from '../utils/roles.js';

export const NOTICE_AUDIENCE_RETAIL = 'retail_staff';
export const NOTICE_AUDIENCE_ISD_NM = 'isd_nm';

const RETAIL_NOTICE_ROLES = ['staff'];
const ISD_NOTICE_ROLES = ['executive', 'team_lead'];

/** Normalise POST body audience; defaults to retail staff. */
export function normalizedNoticeAudience(raw) {
    const a = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (a === 'isd_nm' || a === 'isdnm') return NOTICE_AUDIENCE_ISD_NM;
    return NOTICE_AUDIENCE_RETAIL;
}

function userRolesSeeRetail(roles) {
    return roles.some((r) => RETAIL_NOTICE_ROLES.includes(r));
}

function userRolesSeeIsd(roles) {
    return roles.some((r) => ISD_NOTICE_ROLES.includes(r));
}

/** SQL snippet: notices visible to this user's role(s). */
export function sqlNoticesAudienceMatchesUser(roleOrUser) {
    const roles = Array.isArray(roleOrUser) ? roleOrUser : getUserRoles({ role: roleOrUser });
    if (roles.includes('admin')) {
        return '(1 = 1)';
    }
    const parts = [];
    if (userRolesSeeRetail(roles)) {
        parts.push("(COALESCE(n.audience, 'retail_staff') = 'retail_staff')");
    }
    if (userRolesSeeIsd(roles)) {
        parts.push(`(COALESCE(n.audience, 'retail_staff') = '${NOTICE_AUDIENCE_ISD_NM}')`);
    }
    if (parts.length === 0) {
        return '(1 = 0)';
    }
    return `(${parts.join(' OR ')})`;
}

/** WHERE fragment for counting email recipients (legacy role column + roles JSON). */
export function recipientRolePredicateForAudience(audience) {
    const allowed = audience === NOTICE_AUDIENCE_ISD_NM ? ISD_NOTICE_ROLES : RETAIL_NOTICE_ROLES;
    const inList = allowed.map((r) => `'${r}'`).join(', ');
    const jsonParts = allowed.map((r) => `roles LIKE '%"${r}"%'`).join(' OR ');
    return `(role IN (${inList}) OR ${jsonParts})`;
}
