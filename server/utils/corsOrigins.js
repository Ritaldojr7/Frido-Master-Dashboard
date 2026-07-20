/**
 * CORS origin allowlist.
 *
 * `cors({ origin: true })` reflects whatever Origin the caller sends; combined with
 * `credentials: true` that lets any site a signed-in user visits issue authenticated
 * cross-origin requests to this API. The allowlist below replaces that.
 */

const DEV_ORIGINS = ['http://localhost:3005', 'http://localhost:4000'];

/** Strip trailing slashes so `https://x.com/` and `https://x.com` compare equal. */
function normalizeOrigin(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return null;
    return trimmed.replace(/\/+$/, '').toLowerCase();
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]}
 */
export function buildAllowedOrigins(env = process.env) {
    const configured = [
        env.APP_URL,
        env.FRONTEND_URL,
        ...String(env.CORS_ALLOWED_ORIGINS ?? '').split(','),
    ];

    if (env.NODE_ENV !== 'production') {
        configured.push(...DEV_ORIGINS);
    }

    return [...new Set(configured.map(normalizeOrigin).filter(Boolean))];
}

/**
 * Callback for the `cors` package.
 *
 * A missing Origin header means same-origin, curl, or server-to-server — those are not
 * subject to the browser's cross-origin rules and are allowed through without an
 * Access-Control-Allow-Origin header.
 *
 * @param {NodeJS.ProcessEnv} env
 */
export function createCorsOriginCallback(env = process.env) {
    const allowed = buildAllowedOrigins(env);

    if (env.NODE_ENV === 'production' && allowed.length === 0) {
        console.warn(
            '[cors] No allowed origins resolved (APP_URL / FRONTEND_URL / CORS_ALLOWED_ORIGINS are all unset). ' +
                'All cross-origin requests will be rejected.'
        );
    }

    return (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowed.includes(normalizeOrigin(origin))) return callback(null, true);
        // Reject by declining the origin rather than erroring — the response simply
        // carries no ACAO header and the browser blocks it.
        return callback(null, false);
    };
}
