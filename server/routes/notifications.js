import { Router } from 'express';
import db from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { listNotifications, deduplicateLoginNotifications } from '../services/notificationService.js';

const router = Router();

// Protect all notification routes — verify token first, then enforce admin role
router.use(verifyToken);
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

/**
 * POST /api/notifications/deduplicate-logins
 * One-time cleanup: remove duplicate user_login notifications,
 * keeping only the first per user per 15-minute window.
 */
router.post('/deduplicate-logins', async (_req, res) => {
    try {
        const deletedCount = await deduplicateLoginNotifications();
        res.json({ message: `Removed ${deletedCount} duplicate login notification(s).`, deletedCount });
    } catch (err) {
        console.error('[notifications-route] Error deduplicating login notifications:', err);
        res.status(500).json({ error: 'Failed to deduplicate login notifications.' });
    }
});

/**
 * DELETE /api/notifications/clear-all
 * Delete all notifications from the database (admin only).
 */
router.delete('/clear-all', async (_req, res) => {
    try {
        await db.run('DELETE FROM dashboard_notifications');
        res.json({ message: 'All notifications cleared successfully.' });
    } catch (err) {
        console.error('[notifications-route] Error clearing notifications:', err);
        res.status(500).json({ error: 'Failed to clear notifications.' });
    }
});

export default router;
