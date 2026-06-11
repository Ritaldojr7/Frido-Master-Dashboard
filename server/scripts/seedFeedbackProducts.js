/**
 * Seed feedback department products from src/config/feedbackDatabase.js into Postgres/SQLite.
 *
 * Repo root:
 *   npm run seed:feedback-products
 * Replace all rows:
 *   npm run seed:feedback-products -- --force
 * Upsert from config (no delete):
 *   npm run seed:feedback-products -- --sync
 */
import 'dotenv/config';
import db, { shutdownDb, now } from '../db.js';
import { feedbackData } from '../../src/config/feedbackDatabase.js';

const UPSERT_SQL = `
    INSERT INTO feedback_products (stable_id, sort_order, payload, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(stable_id) DO UPDATE SET
        sort_order = excluded.sort_order,
        payload = excluded.payload,
        updated_at = excluded.updated_at
`;

async function main() {
    const force = process.argv.includes('--force');
    const sync = process.argv.includes('--sync');

    const existingCount = await db.get(`SELECT COUNT(*) AS n FROM feedback_products`);
    const n = Number(existingCount?.n ?? existingCount?.count ?? 0);
    if (n > 0 && !force && !sync) {
        console.log(
            `[seed-feedback-products] Skipping — ${n} row(s) exist (pass --force to replace all or --sync to upsert)`
        );
        await shutdownDb();
        return;
    }

    if (n > 0 && force) {
        await db.run(`DELETE FROM feedback_products`);
        console.log('[seed-feedback-products] Cleared existing rows (--force)');
    }

    let sortOrder = 0;
    const iso = now();
    for (const row of feedbackData) {
        const stableId = Number(row.id);
        if (!Number.isFinite(stableId)) {
            console.warn('[seed-feedback-products] Skip row without numeric id:', row);
            continue;
        }
        const payload = JSON.stringify({ ...row, id: stableId });
        const sql =
            force || n === 0
                ? `INSERT INTO feedback_products (stable_id, sort_order, payload, updated_at)
                   VALUES (?, ?, ?, ?)`
                : UPSERT_SQL;
        await db.run(sql, [stableId, sortOrder++, payload, iso]);
    }

    const mode = sync ? 'synced' : 'seeded';
    console.log(`✓ ${mode} feedback_products: ${sortOrder} products`);
}

main()
    .catch((err) => {
        console.error('[seed-feedback-products]', err);
        process.exitCode = 1;
    })
    .finally(() => shutdownDb());
