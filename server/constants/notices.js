export const NOTICE_AUDIENCE_RETAIL = 'retail_staff';
export const NOTICE_AUDIENCE_ISD_NM = 'isd_nm';

/** Normalise POST body audience; defaults to retail staff. */
export function normalizedNoticeAudience(raw) {
    const a = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (a === 'isd_nm' || a === 'isdnm') return NOTICE_AUDIENCE_ISD_NM;
    return NOTICE_AUDIENCE_RETAIL;
}

/** SQL snippet: notices visible to this dashboard role. */
export function sqlNoticesAudienceMatchesUser(role) {
    const r = String(role || '');
    if (r === 'staff' || r === 'viewer') {
        return "(COALESCE(n.audience, 'retail_staff') = 'retail_staff')";
    }
    if (r === 'executive' || r === 'team_lead') {
        return `(COALESCE(n.audience, 'retail_staff') = '${NOTICE_AUDIENCE_ISD_NM}')`;
    }
    return '(1 = 0)';
}

/** WHERE fragment for counting email recipients */
export function recipientRolePredicateForAudience(audience) {
    return audience === NOTICE_AUDIENCE_ISD_NM
        ? "role IN ('executive', 'team_lead')"
        : "role IN ('staff', 'viewer')";
}
