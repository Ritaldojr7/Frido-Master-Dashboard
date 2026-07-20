/**
 * Order Dispute — data served from Supabase snapshots (synced from Google Sheets).
 */
import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { syncLimiter } from '../middleware/rateLimit.js';
import { bearerSecret, timingSafeCompare } from '../utils/security.js';
import {
    getOrderDisputeSyncStatus,
    loadOrderDisputeFromDb,
    syncOrderDisputeFromSheets,
    isSyncAuthorized,
} from '../services/orderDisputeSync.js';

const router = Router();

/** External cron — secret token only (no Clerk session). Must be registered before verifyToken. */
router.post('/sync/cron', syncLimiter, async (req, res) => {
    const secret = String(process.env.ORDER_DISPUTE_SYNC_SECRET ?? '').trim();
    if (!secret) {
        return res.status(503).json({ error: 'ORDER_DISPUTE_SYNC_SECRET is not set' });
    }
    if (!timingSafeCompare(bearerSecret(req), secret)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const result = await syncOrderDisputeFromSheets();
        if (result.skipped && result.reason === 'not_configured') {
            return res.status(503).json({ error: 'Google Sheets not configured' });
        }
        if (result.skipped && result.reason === 'sync_in_progress') {
            return res.status(409).json({ error: 'Sync already in progress' });
        }
        res.json(result);
    } catch (err) {
        console.error('[order-disputes/sync/cron]', err);
        res.status(500).json({ error: err.message || 'Sync failed' });
    }
});

router.use(verifyToken);
router.use(requireRole(['admin']));

router.get('/status', async (_req, res) => {
    try {
        const status = await getOrderDisputeSyncStatus();
        res.json(status);
    } catch (err) {
        console.error('[order-disputes/status]', err);
        res.status(500).json({ error: 'Failed to load sync status' });
    }
});

router.get('/', async (_req, res) => {
    try {
        const payload = await loadOrderDisputeFromDb();
        res.json({
            ...payload,
            fetchedAt: payload.syncedAt,
        });
    } catch (err) {
        console.error('[order-disputes]', err);
        res.status(500).json({ error: err.message || 'Failed to load order dispute data' });
    }
});

router.post('/sync', syncLimiter, async (req, res) => {
    if (!isSyncAuthorized(req)) {
        return res.status(403).json({ error: 'Admin role or sync secret required' });
    }

    try {
        const result = await syncOrderDisputeFromSheets();
        if (result.skipped && result.reason === 'not_configured') {
            return res.status(503).json({
                error: 'Google Sheets credentials are not configured on the server.',
                hint: 'Set GOOGLE_SERVICE_ACCOUNT_JSON and share the sheet with the service account email.',
            });
        }
        if (result.skipped && result.reason === 'sync_in_progress') {
            return res.status(409).json({ error: 'Sync already in progress' });
        }
        res.json(result);
    } catch (err) {
        console.error('[order-disputes/sync]', err);
        res.status(500).json({ error: err.message || 'Sync failed' });
    }
});

export default router;
