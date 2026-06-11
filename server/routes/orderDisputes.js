/**
 * Order Dispute data from Google Sheets (read-only).
 */
import { Router } from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { fetchOrderDisputeSheets, googleSheetsConfigured } from '../services/googleSheets.js';

const router = Router();

const CACHE_TTL_MS = Number(process.env.ORDER_DISPUTE_CACHE_MS ?? 60_000);
let cache = null;
let cacheAt = 0;

router.use(verifyToken);
router.use(requireRole(['admin', 'staff', 'viewer', 'executive', 'team_lead']));

router.get('/status', (_req, res) => {
    res.json({
        configured: googleSheetsConfigured(),
        cacheTtlMs: CACHE_TTL_MS,
    });
});

router.get('/', async (_req, res) => {
    try {
        const now = Date.now();
        if (cache && now - cacheAt < CACHE_TTL_MS) {
            return res.json({ ...cache, cached: true });
        }

        const payload = await fetchOrderDisputeSheets();
        cache = payload;
        cacheAt = now;
        res.json({ ...payload, cached: false });
    } catch (err) {
        if (err.code === 'SHEETS_NOT_CONFIGURED') {
            return res.status(503).json({
                error: 'Order Dispute Google Sheets integration is not configured on the server.',
                hint: 'Set GOOGLE_SERVICE_ACCOUNT_JSON and share the sheet with the service account email.',
            });
        }
        console.error('[order-disputes]', err);
        res.status(500).json({ error: err.message || 'Failed to load order dispute data' });
    }
});

export default router;
