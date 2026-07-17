import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { isManpowerConfigured } from '../services/manpowerSheets.js';
import { aggregateLeaderboard } from '../services/manpowerData.js';
import {
    getManpowerSyncStatus,
    loadManpowerFromDb,
    syncManpowerFromSheets,
    isSyncAuthorized,
} from '../services/manpowerSync.js';

const router = Router();

/** External cron — secret token only (no Clerk session). Must be registered before verifyToken. */
router.post('/sync/cron', async (req, res) => {
    const secret = String(process.env.MANPOWER_SYNC_SECRET ?? '').trim();
    if (!secret) {
        return res.status(503).json({ error: 'MANPOWER_SYNC_SECRET is not set' });
    }
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
    const token = bearer || String(req.query.token ?? '').trim();
    if (token !== secret) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const result = await syncManpowerFromSheets();
        if (result.skipped && result.reason === 'not_configured') {
            return res.status(503).json({ error: 'Google Sheets not configured' });
        }
        if (result.skipped && result.reason === 'sync_in_progress') {
            return res.status(409).json({ error: 'Sync already in progress' });
        }
        res.json(result);
    } catch (err) {
        console.error('[manpower/sync/cron]', err);
        res.status(500).json({ error: err.message || 'Sync failed' });
    }
});

/** Shared secret bypass for POST /sync (runs before Clerk auth). */
router.post('/sync', async (req, res, next) => {
    if (isSyncAuthorized(req)) {
        try {
            const result = await syncManpowerFromSheets();
            if (result.skipped && result.reason === 'not_configured') {
                return res.status(503).json({
                    error: 'Google Sheets credentials are not configured on the server.',
                    hint: 'Set GOOGLE_SERVICE_ACCOUNT_JSON, MANPOWER_SPREADSHEET_ID, and share the sheet with the service account email.',
                });
            }
            if (result.skipped && result.reason === 'sync_in_progress') {
                return res.status(409).json({ error: 'Sync already in progress' });
            }
            return res.json(result);
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Sync failed' });
        }
    }
    next();
}, verifyToken, async (req, res) => {
    if (!isSyncAuthorized(req)) {
        return res.status(403).json({ error: 'Forbidden: Admin role or valid sync secret required' });
    }

    try {
        const result = await syncManpowerFromSheets();
        if (result.skipped && result.reason === 'not_configured') {
            return res.status(503).json({
                error: 'Google Sheets credentials are not configured on the server.',
            });
        }
        if (result.skipped && result.reason === 'sync_in_progress') {
            return res.status(409).json({ error: 'Sync already in progress' });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Sync failed' });
    }
});

router.use(verifyToken);
router.use(requireRole(['admin', 'team_lead']));

/**
 * GET /status — Get sync status and counts
 */
router.get('/status', async (_req, res) => {
    try {
        const status = await getManpowerSyncStatus();
        res.json(status);
    } catch (err) {
        console.error('[manpower/status]', err);
        res.status(500).json({ error: 'Failed to load sync status' });
    }
});

/**
 * GET / — Get all attendance records from Supabase/Postgres
 */
router.get('/', async (_req, res) => {
    try {
        let payload = await loadManpowerFromDb();

        if (!payload.attendance.length && isManpowerConfigured()) {
            await syncManpowerFromSheets();
            payload = await loadManpowerFromDb();
        }

        res.json({
            attendance: payload.attendance,
            fetchedAt: payload.fetchedAt,
            warnings: payload.warnings,
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to load attendance' });
    }
});

/**
 * GET /leaderboard — Get aggregated leaderboard metrics
 */
router.get('/leaderboard', async (req, res) => {
    try {
        let payload = await loadManpowerFromDb();

        if (!payload.attendance.length && isManpowerConfigured()) {
            await syncManpowerFromSheets();
            payload = await loadManpowerFromDb();
        }

        const period = String(req.query.period || '').trim();
        const startDate = String(req.query.startDate || '').trim();
        const endDate = String(req.query.endDate || '').trim();
        const vertical = String(req.query.vertical || 'all').trim();
        const sortBy = String(req.query.sortBy || 'calls').trim();

        if (!period && (!startDate || !endDate)) {
            return res.status(400).json({ error: 'Missing required query parameter "period" or both "startDate" and "endDate"' });
        }

        const leaderboard = aggregateLeaderboard(payload.attendance, period, vertical, sortBy, startDate, endDate);

        res.json({
            ...leaderboard,
            fetchedAt: payload.fetchedAt,
        });
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to generate leaderboard' });
    }
});

export default router;
