/**
 * Dashboard seeder service.
 * Keeps Phase 1 dashboard link trees (`isd_nm`, `staff_experience_store`) in DB
 * synchronized with `src/config/dashboardData.js` on server startup.
 */
import { v4 as uuid } from 'uuid';
import { isdNmData, staffExperienceStoreData } from '../../src/config/dashboardData.js';

export async function syncPhaseOneDashboardDefs(db) {
    if (!db || typeof db.run !== 'function') return;
    const now = () => new Date().toISOString();
    const snapshots = [
        ['isd_nm', isdNmData],
        ['staff_experience_store', staffExperienceStoreData],
    ];

    for (const [slug, data] of snapshots) {
        if (!data || !data.sections) continue;
        try {
            await db.run(`DELETE FROM dashboard_defs WHERE slug = ?`, [slug]);
            const defId = uuid();
            const iso = now();
            await db.run(
                `INSERT INTO dashboard_defs (id, slug, title, back_route, metadata, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [defId, slug, data.title, data.backRoute != null ? data.backRoute : '', '{}', iso, iso]
            );

            let sectionOrder = 0;
            for (const sec of data.sections || []) {
                const sectionId = uuid();
                await db.run(
                    `INSERT INTO dashboard_sections (id, dashboard_id, stable_id, sort_order, title, icon, accent_color)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [sectionId, defId, sec.id, sectionOrder++, sec.title, sec.icon ?? '', sec.accentColor ?? 'blue']
                );

                let linkOrder = 0;
                for (const link of sec.links || []) {
                    const linkId = uuid();
                    const payload = typeof link === 'object' && link !== null ? JSON.stringify(link) : '{}';
                    await db.run(
                        `INSERT INTO dashboard_links (id, section_id, sort_order, payload)
                         VALUES (?, ?, ?, ?)`,
                        [linkId, sectionId, linkOrder++, payload]
                    );
                }
            }
        } catch (err) {
            console.error(`[dashboardSeeder] Failed to sync slug "${slug}":`, err.message);
        }
    }
}
