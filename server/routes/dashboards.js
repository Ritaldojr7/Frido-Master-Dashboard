import { Router } from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { dashboardsFromJoinedRows } from '../utils/dashboardMapper.js';
import { PHASE_ONE_DASHBOARD_SLUGS } from '../constants/dashboardSlugs.js';

const router = Router();

function validSlug(s) {
    return typeof s === 'string' && /^[a-z0-9_-]+$/.test(s);
}

/**
 * @param {string[]} slugs
 */
async function fetchJoinedRows(slugs) {
    if (!slugs.length) return [];
    const ph = slugs.map(() => '?').join(', ');
    const sql = `
        SELECT
            dd.slug AS slug,
            dd.title AS def_title,
            dd.back_route AS back_route,
            dd.updated_at AS def_updated_at,
            ds.id AS section_row_id,
            ds.stable_id AS stable_id,
            ds.sort_order AS section_sort_order,
            ds.title AS section_title,
            ds.icon AS section_icon,
            ds.accent_color AS accent_color,
            dl.payload AS link_payload,
            dl.sort_order AS link_sort_order
        FROM dashboard_defs dd
        INNER JOIN dashboard_sections ds ON ds.dashboard_id = dd.id
        LEFT JOIN dashboard_links dl ON dl.section_id = ds.id
        WHERE dd.slug IN (${ph})
        ORDER BY
            dd.slug ASC,
            ds.sort_order ASC,
            CASE WHEN dl.id IS NULL THEN 1 ELSE 0 END ASC,
            dl.sort_order ASC
    `;
    return db.all(sql, slugs);
}

/**
 * Bulk (default slugs when `slugs` query omitted — Phase 1).
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const raw = req.query.slugs;
        const slugList = raw
            ? String(raw)
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .filter(validSlug)
            : [...PHASE_ONE_DASHBOARD_SLUGS];

        if (raw != null && String(raw).trim() && slugList.length === 0) {
            return res.status(400).json({ error: 'No valid dashboard slugs in query' });
        }

        const desired = slugList.length ? slugList : [...PHASE_ONE_DASHBOARD_SLUGS];

        const rows = await fetchJoinedRows(desired);
        const built = dashboardsFromJoinedRows(rows);
        /** @type {Record<string, object>} */
        const dashboards = {};
        for (const slug of desired) {
            if (built[slug]) dashboards[slug] = built[slug];
        }

        res.json({ dashboards });
    } catch (err) {
        console.error('[dashboards] GET bulk', err);
        res.status(500).json({ error: 'Failed to load dashboards' });
    }
});

/** Single slug — `{ title, backRoute, sections, slug?, updatedAt? }`. */
router.get('/:slug', verifyToken, async (req, res) => {
    const slug = req.params.slug;
    if (!validSlug(slug)) {
        return res.status(400).json({ error: 'Invalid slug' });
    }
    try {
        const rows = await fetchJoinedRows([slug]);
        const built = dashboardsFromJoinedRows(rows);
        const d = built[slug];
        if (!d) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        const { slug: _omit, ...rest } = d;
        res.json(rest);
    } catch (err) {
        console.error('[dashboards] GET :slug', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

export default router;
