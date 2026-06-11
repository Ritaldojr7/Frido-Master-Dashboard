/**
 * Frido Master Dashboard — Express API Server
 * Handles auth, user management, and Azure email integration.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import noticeRoutes from './routes/notices.js';
import dashboardRoutes from './routes/dashboards.js';
import feedbackProductsRoutes from './routes/feedbackProducts.js';
import hrPoliciesRoutes from './routes/hrPolicies.js';
import orderDisputesRoutes from './routes/orderDisputes.js';
import db from './db.js';

if (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV === 'production') {
    console.warn(
        '[Frido Dashboard] CLERK_SECRET_KEY is not set — /api/users and /api/notices will reject tokens.'
    );
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || process.env.API_PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const BRAND_DIR = path.resolve(__dirname, '..', 'src', 'assets');

// ── Middleware ───────────────────────────────────────────
// Reflect requesting Origin when credentials are used (dev-friendly for localhost:3000 + :4000 + LAN).
app.use(
    cors({
        origin: true,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/feedback/products', feedbackProductsRoutes);
app.use('/api/hr-policies', hrPoliciesRoutes);
app.use('/api/order-disputes', orderDisputesRoutes);

// ── Health check ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'frido-dashboard-api', timestamp: new Date().toISOString() });
});

/**
 * Keep hosted Postgres warm (e.g. Supabase pause after ~7d idle). Runs `SELECT 1`.
 * Set DB_PING_SECRET in env; call from a scheduler (GitHub Actions, cron-job.org, etc.) every 1–2 days.
 * Prefer header: Authorization: Bearer <DB_PING_SECRET>  (avoid putting the secret in query strings in logs).
 */
app.get('/api/health/db', async (req, res) => {
    const secret = String(process.env.DB_PING_SECRET ?? '').trim();
    if (!secret) {
        return res.status(503).json({ error: 'DB_PING_SECRET is not set' });
    }
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
    const token = bearer || String(req.query.token ?? '').trim();
    if (token !== secret) {
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

// ── Public branding assets (used by transactional emails) ─
app.use('/brand', express.static(BRAND_DIR, {
    immutable: true,
    maxAge: '7d',
}));

// ── Static frontend for Render/full-stack production ─────
app.use(express.static(DIST_DIR));

// ── 404 handler ─────────────────────────────────────────
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
        if (err) next();
    });
});

// ── Error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n⚡ Frido API Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   DB ping (if DB_PING_SECRET set): http://localhost:${PORT}/api/health/db\n`);
});
