/**
 * Express application factory — used by server/index.js and integration tests.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { clerkMiddleware } from '@clerk/express';
import { createCorsOriginCallback } from './utils/corsOrigins.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { bearerSecret, timingSafeCompare } from './utils/security.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import noticeRoutes from './routes/notices.js';
import dashboardRoutes from './routes/dashboards.js';
import feedbackProductsRoutes from './routes/feedbackProducts.js';
import hrPoliciesRoutes from './routes/hrPolicies.js';
import orderDisputesRoutes from './routes/orderDisputes.js';
import dashboardEditRoutes from './routes/dashboardEdit.js';
import manpowerRoutes from './routes/manpower.js';
import organizationConfigRoutes from './routes/organizationConfig.js';
import { protectStaticDashboards } from './middleware/protectStaticDashboards.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DIST_DIR = path.resolve(__dirname, '..', 'dist');
export const BRAND_DIR = path.resolve(__dirname, '..', 'src', 'assets');

function getClerkPublishableKey() {
    return String(
        process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
    ).trim();
}

export function createApp() {
    const app = express();
    app.set('trust proxy', 1);

    app.use(
        helmet({
            // The SPA embeds its own static dashboards in iframes — DENY would break every
            // one of them. Same-origin framing must stay permitted.
            frameguard: { action: 'sameorigin' },
            // Report-only for now: the static dashboards under public/ carry inline scripts
            // and styles that a strict policy would block. Collect violations first, then
            // tighten in a follow-up before enforcing.
            contentSecurityPolicy: {
                reportOnly: true,
                directives: {
                    defaultSrc: ["'self'"],
                    frameAncestors: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'", 'https:'],
                    frameSrc: ["'self'", 'https:'],
                },
            },
            // Third-party embeds (Locobuzz, Tangoeye, published Google Sheets) fail under COEP.
            crossOriginEmbedderPolicy: false,
            // Static dashboards are framed by the SPA and load cross-origin assets.
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            hsts:
                process.env.NODE_ENV === 'production'
                    ? { maxAge: 15552000, includeSubDomains: true }
                    : false,
        })
    );

    app.use(
        cors({
            origin: createCorsOriginCallback(process.env),
            credentials: true,
        })
    );
    app.use(express.json());
    app.use(cookieParser());

    const clerkSecretKey = String(process.env.CLERK_SECRET_KEY ?? '').trim();
    const clerkPublishableKey = getClerkPublishableKey();

    if (clerkSecretKey && clerkPublishableKey) {
        app.use(
            clerkMiddleware({
                secretKey: clerkSecretKey,
                publishableKey: clerkPublishableKey,
            })
        );
    } else if (clerkSecretKey) {
        console.warn(
            '[Frido Dashboard] CLERK_PUBLISHABLE_KEY (or VITE_CLERK_PUBLISHABLE_KEY) is missing — static dashboard auth middleware disabled.'
        );
    }

    // Must come AFTER clerkMiddleware: the limiter keys on the Clerk session id so each user
    // gets their own budget. Mounted earlier it would only ever see an IP, and Frido staff
    // share an office NAT — one blocked key would lock out everyone at once.
    app.use('/api', apiLimiter);

    app.use('/api/config/organization', organizationConfigRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/notices', noticeRoutes);
    app.use('/api/dashboards', dashboardRoutes);
    app.use('/api/feedback/products', feedbackProductsRoutes);
    app.use('/api/hr-policies', hrPoliciesRoutes);
    app.use('/api/order-disputes', orderDisputesRoutes);
    app.use('/api/manpower', manpowerRoutes);
    app.use('/api', dashboardEditRoutes);

    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', service: 'frido-dashboard-api', timestamp: new Date().toISOString() });
    });

    app.get('/api/health/db', async (req, res) => {
        const { default: db } = await import('./db.js');
        const secret = String(process.env.DB_PING_SECRET ?? '').trim();
        if (!secret) {
            return res.status(503).json({ error: 'DB_PING_SECRET is not set' });
        }
        if (!timingSafeCompare(bearerSecret(req), secret)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        try {
            await db.get('SELECT 1 AS ok');
            return res.json({
                status: 'ok',
                database: db.client,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            console.error('[health/db]', err.message);
            return res.status(500).json({ error: 'Database ping failed', message: err.message });
        }
    });

    app.use(
        '/brand',
        express.static(BRAND_DIR, {
            immutable: true,
            maxAge: '7d',
        })
    );

    app.use(protectStaticDashboards);
    app.use(express.static(DIST_DIR));

    app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
            if (err) next();
        });
    });

    app.use((err, _req, res, _next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });

    return app;
}
