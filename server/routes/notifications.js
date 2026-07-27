import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { listNotifications } from '../services/notificationService.js';

const router = Router();

// Protect all notification routes to admin only
router.use(requireRole(['admin']));

/**
 * GET /api/notifications
 * Query notifications for admin dashboard and notifications tab.
 * Query params: ?limit=50&offset=0&type=upload|access_request|user_login&search=...
 */
router.get('/', async (req, res) => {
    try {
        const { limit, offset, type, search } = req.query;
        const result = await listNotifications({ limit, offset, type, search });
        res.json(result);
    } catch (err) {
        console.error('[notifications-route] Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
});

/**
 * GET /api/notifications/summary
 * Quick preview endpoint for header navbar bell icon dropdown.
 */
router.get('/summary', async (_req, res) => {
    try {
        const result = await listNotifications({ limit: 10, offset: 0 });
        res.json({
            recent: result.notifications,
            total: result.total,
        });
    } catch (err) {
        console.error('[notifications-route] Error fetching notification summary:', err);
        res.status(500).json({ error: 'Failed to retrieve notification summary.' });
    }
});

export default router;
