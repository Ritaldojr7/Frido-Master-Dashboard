import { Router } from 'express';
import db from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

/** Feedback DB page — admins + feedback department only (matches route guard). */
router.get('/', verifyToken, requireRole(['admin', 'feedback']), async (_req, res) => {
    try {
        const rows = await db.all(
            `SELECT stable_id, payload FROM feedback_products ORDER BY sort_order ASC, stable_id ASC`
        );
        const products = [];
        for (const row of rows || []) {
            try {
                const obj =
                    typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
                if (!obj || typeof obj !== 'object') continue;
                const id = Number(obj.id ?? row.stable_id);
                if (!Number.isFinite(id)) continue;
                products.push({ ...obj, id });
            } catch {
                /* skip malformed row */
            }
        }
        res.json({ products });
    } catch (err) {
        console.error('[feedback-products]', err);
        res.status(500).json({ error: 'Failed to load feedback products' });
    }
});

export default router;
