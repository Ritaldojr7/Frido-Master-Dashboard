/**
 * Require a Clerk session before serving static HTML dashboards.
 * Iframe requests include Clerk session cookies on the same origin.
 */
import { getAuth } from '@clerk/express';

export const PROTECTED_STATIC_PREFIXES = [
    '/exec-dashboard',
    '/fes-sm-dashboard',
    '/ist-console',
    '/orm-dashboard',
    '/retail-feedback',
    '/salary-analysis',
];

export function isProtectedStaticPath(pathname) {
    return PROTECTED_STATIC_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

export function protectStaticDashboards(req, res, next) {
    if (!isProtectedStaticPath(req.path)) {
        return next();
    }

    if (process.env.VITE_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production') {
        return next();
    }

    const { userId } = getAuth(req);
    if (userId) {
        return next();
    }

    if (req.headers.authorization?.startsWith('Bearer ')) {
        return next();
    }

    return res.status(401).type('html').send(
        '<!DOCTYPE html><html><body><h1>Authentication required</h1><p>Sign in to the Frido Master Dashboard to view this page.</p></body></html>'
    );
}
