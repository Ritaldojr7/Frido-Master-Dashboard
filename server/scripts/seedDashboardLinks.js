/**
 * Seed Phase 1 dashboard link trees (`isd_nm`, `staff_experience_store`) from
 * src/config/dashboardData.js into Postgres or local SQLite via server/db.js.
 *
 * Prerequisites: app schema migrated (dashboard_* tables exist).
 *
 * Repo root:
 *   npm run seed:dashboard-links
 * Re-seed (delete existing rows for these slugs):
 *   npm run seed:dashboard-links -- --force
 *
 * Requires DATABASE_URL for Supabase Postgres, or omit for SQLite default.
 */
import 'dotenv/config';
import { v4 as uuid } from 'uuid';

import db, { shutdownDb, now } from '../db.js';
import {
    PHASE_ONE_DASHBOARD_SLUGS,
} from '../constants/dashboardSlugs.js';
import { isdNmData, staffExperienceStoreData } from '../../src/config/dashboardData.js';

function pickStaticSnapshots() {
    return [
        ['isd_nm', isdNmData],
        ['staff_experience_store', staffExperienceStoreData],
    ];
}

/**
 * @param {string[][]} snapshots
 */
function ensureSlugAgreement(snapshots) {
    const got = snapshots.map(([s]) => s).sort().join('|');
    const want = [...PHASE_ONE_DASHBOARD_SLUGS].sort().join('|');
    if (got !== want) {
        console.warn(
            '[seed-dashboard-links] Slug manifest mismatch:',
            PHASE_ONE_DASHBOARD_SLUGS,
            'vs',
            snapshots.map(([x]) => x)
        );
    }
}

async function seedOne(slug, data, iso) {
    const defId = uuid();

    await db.run(
        `INSERT INTO dashboard_defs (id, slug, title, back_route, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            defId,
            slug,
            data.title,
            data.backRoute != null ? data.backRoute : '',
            '{}',
            iso,
            iso,
        ]
    );

    let sectionOrder = 0;
    for (const sec of data.sections || []) {
        const sectionId = uuid();
        await db.run(
            `INSERT INTO dashboard_sections
             (id, dashboard_id, stable_id, sort_order, title, icon, accent_color)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                sectionId,
                defId,
                sec.id,
                sectionOrder++,
                sec.title,
                sec.icon ?? '',
                sec.accentColor ?? 'blue',
            ]
        );

        let linkOrder = 0;
        for (const link of sec.links || []) {
            const linkId = uuid();
            const payload =
                typeof link === 'object' && link !== null ? JSON.stringify(link) : '{}';
            await db.run(
                `INSERT INTO dashboard_links (id, section_id, sort_order, payload)
                 VALUES (?, ?, ?, ?)`,
                [linkId, sectionId, linkOrder++, payload]
            );
        }
    }

    console.log(`✓ Seeded dashboard_defs slug="${slug}" with ${sectionOrder} sections`);
}

async function main() {
    const force = process.argv.includes('--force');

    const snapshots = pickStaticSnapshots();
    ensureSlugAgreement(snapshots);

    for (const [slug, data] of snapshots) {
        const existing = await db.get(`SELECT slug FROM dashboard_defs WHERE slug = ?`, [slug]);
        if (existing && !force) {
            console.log(`Skipping ${slug} — already seeded (pass --force to replace)`);
            continue;
        }
        if (existing && force) {
            await db.run(`DELETE FROM dashboard_defs WHERE slug = ?`, [slug]);
            console.log(`Removed existing slug="${slug}" before re-seed`);
        }
        if (!data) {
            console.error(`Missing snapshot for slug ${slug}`);
            process.exitCode = 1;
            continue;
        }
        await seedOne(slug, data, now());
    }

    console.log('[seed-dashboard-links] Done.');
}

main()
    .catch((err) => {
        console.error('[seed-dashboard-links]', err);
        process.exitCode = 1;
    })
    .finally(() => shutdownDb());
