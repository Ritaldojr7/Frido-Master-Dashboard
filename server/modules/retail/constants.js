/**
 * Retail module (server) — owned constants.
 *
 * These are the retail-specific values that shared server infrastructure needs.
 * The shared files import them from here instead of hard-coding retail strings,
 * so the retail server surface is discoverable in one place. The surrounding
 * logic (notices audience SQL, dashboard slug fan-out, static-dashboard auth)
 * stays in its shared home because it is inherently multi-section.
 */

/** Postgres `dashboard_defs.slug` for the Retail Staff portal link tree. */
export const RETAIL_DASHBOARD_SLUG = 'staff_experience_store';

/** Notices audience tag for retail staff (see server/constants/notices.js). */
export const NOTICE_AUDIENCE_RETAIL = 'retail_staff';

/** Roles whose users see retail-audience notices. */
export const RETAIL_NOTICE_ROLES = ['staff'];

/**
 * Static-HTML dashboard prefix owned by retail (the Store Analytics Console
 * iframe target). The authorization policy itself lives, by design, in the
 * centralized server/middleware/protectStaticDashboards.js.
 */
export const RETAIL_STATIC_PREFIX = '/fes-sm-dashboard';
