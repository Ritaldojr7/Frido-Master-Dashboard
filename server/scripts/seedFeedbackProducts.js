/**
 * Seed feedback department products from src/config/feedbackDatabase.js into Postgres/SQLite.
 *
 * Repo root:
 *   npm run seed:feedback-products
 * Replace all rows:
 *   npm run seed:feedback-products -- --force
 */
import 'dotenv/config';
import db, { shutdownDb, now } from '../db.js';
import { feedbackData } from '../../src/config/feedbackDatabase.js';

async function main() {
    const force = process.argv.includes('--force');

    const existingCount = await db.get(`SELECT COUNT(*) AS n FROM feedback_products`);
    const n = Number(existingCount?.n ?? existingCount?.count ?? 0);
    if (n > 0 && !force) {
        console.log(
            `[seed-feedback-products] Skipping — ${n} row(s) exist (pass --force to replace all)`
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
        await db.run(
            `INSERT INTO feedback_products (stable_id, sort_order, payload, updated_at)
             VALUES (?, ?, ?, ?)`,
            [stableId, sortOrder++, payload, iso]
        );
    }

    console.log(`✓ Seeded feedback_products: ${sortOrder} products`);
}

main()
    .catch((err) => {
        console.error('[seed-feedback-products]', err);
        process.exitCode = 1;
    })
    .finally(() => shutdownDb());
