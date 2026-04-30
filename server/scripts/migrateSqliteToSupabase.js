/**
 * Copy data from local SQLite → Postgres (Supabase). Tables must match app schema.
 *
 * Prerequisites:
 *   - Supabase project created; copy URI from Settings → Database → Connection string (URI).
 *   - Prefer "Direct connection" (port 5432) or Session pooler; avoid mixing modes unexpectedly.
 *
 * Usage (repo root):
 *   DATABASE_URL="postgresql://postgres.[ref]:[pw]@...pooler.supabase.com:6543/postgres" \\
 *     node server/scripts/migrateSqliteToSupabase.js [optional/path/to/frido.db]
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import pg from 'pg';
import { schemaStatements } from '../schema/pgStatements.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL?.trim();
if (!url) {
    console.error('Missing DATABASE_URL. Use your Supabase Postgres URI.');
    process.exit(1);
}

const sqlitePath =
    process.argv[2] ||
    process.env.SQLITE_DB_PATH ||
    path.join(__dirname, '..', 'data', 'frido.db');

if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite file not found: ${sqlitePath}`);
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString: url,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

const sqlite = new Database(sqlitePath, { readonly: true });

function sqliteTableExists(name) {
    const row = sqlite
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(name);
    return Boolean(row);
}

function sqliteHasColumn(table, col) {
    return sqlite.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
}

async function ensurePgExtras() {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name TEXT');
    await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS sent_by_name TEXT');
}

async function main() {
    console.log('Ensuring Postgres schema...');
    for (const stmt of schemaStatements()) {
        await pool.query(stmt);
    }
    await ensurePgExtras();

    console.log(`Reading SQLite: ${sqlitePath}`);

    const userRows = sqlite.prepare('SELECT * FROM users').all();
    for (const r of userRows) {
        await pool.query(
            `INSERT INTO users (
                id, email, name, password_hash, role, department, store_name, avatar_url,
                status, last_login, created_at, updated_at, deleted_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            ON CONFLICT (email) DO UPDATE SET
                id = EXCLUDED.id,
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                department = EXCLUDED.department,
                store_name = EXCLUDED.store_name,
                avatar_url = EXCLUDED.avatar_url,
                status = EXCLUDED.status,
                last_login = EXCLUDED.last_login,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at`,
            [
                r.id,
                r.email,
                r.name,
                r.password_hash ?? '',
                r.role,
                r.department ?? '',
                sqliteHasColumn('users', 'store_name') ? r.store_name ?? '' : '',
                r.avatar_url ?? '',
                r.status,
                r.last_login ?? null,
                r.created_at,
                r.updated_at,
                sqliteHasColumn('users', 'deleted_at') ? r.deleted_at ?? null : null,
            ]
        );
    }
    console.log(`✓ Users: ${userRows.length}`);

    if (sqliteTableExists('invite_tokens')) {
        const rows = sqlite.prepare('SELECT * FROM invite_tokens').all();
        for (const r of rows) {
            await pool.query(
                `INSERT INTO invite_tokens (
                    id, user_id, email, token_hash, role, expires_at, used, invited_by, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                ON CONFLICT (id) DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    email = EXCLUDED.email,
                    token_hash = EXCLUDED.token_hash,
                    role = EXCLUDED.role,
                    expires_at = EXCLUDED.expires_at,
                    used = EXCLUDED.used,
                    invited_by = EXCLUDED.invited_by,
                    created_at = EXCLUDED.created_at`,
                [
                    r.id,
                    r.user_id,
                    r.email,
                    r.token_hash,
                    r.role,
                    r.expires_at,
                    r.used,
                    r.invited_by,
                    r.created_at,
                ]
            );
        }
        console.log(`✓ invite_tokens: ${rows.length}`);
    }

    if (sqliteTableExists('notices')) {
        const rows = sqlite.prepare('SELECT * FROM notices').all();
        for (const r of rows) {
            await pool.query(
                `INSERT INTO notices (
                    id, title, body, priority, requires_ack, sent_by_name, cta_label, cta_url,
                    starts_at, ends_at, active, created_by, created_at, updated_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    body = EXCLUDED.body,
                    priority = EXCLUDED.priority,
                    requires_ack = EXCLUDED.requires_ack,
                    sent_by_name = EXCLUDED.sent_by_name,
                    cta_label = EXCLUDED.cta_label,
                    cta_url = EXCLUDED.cta_url,
                    starts_at = EXCLUDED.starts_at,
                    ends_at = EXCLUDED.ends_at,
                    active = EXCLUDED.active,
                    created_by = EXCLUDED.created_by,
                    created_at = EXCLUDED.created_at,
                    updated_at = EXCLUDED.updated_at`,
                [
                    r.id,
                    r.title,
                    r.body,
                    r.priority,
                    r.requires_ack,
                    sqliteHasColumn('notices', 'sent_by_name') ? r.sent_by_name ?? '' : '',
                    r.cta_label ?? '',
                    r.cta_url ?? '',
                    r.starts_at ?? null,
                    r.ends_at ?? null,
                    r.active,
                    r.created_by,
                    r.created_at,
                    r.updated_at,
                ]
            );
        }
        console.log(`✓ notices: ${rows.length}`);
    }

    if (sqliteTableExists('notice_receipts')) {
        const rows = sqlite.prepare('SELECT * FROM notice_receipts').all();
        for (const r of rows) {
            await pool.query(
                `INSERT INTO notice_receipts (notice_id, user_id, seen_at, acknowledged_at, dismissed_at)
                 VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (notice_id, user_id) DO UPDATE SET
                    seen_at = EXCLUDED.seen_at,
                    acknowledged_at = EXCLUDED.acknowledged_at,
                    dismissed_at = EXCLUDED.dismissed_at`,
                [r.notice_id, r.user_id, r.seen_at ?? null, r.acknowledged_at ?? null, r.dismissed_at ?? null]
            );
        }
        console.log(`✓ notice_receipts: ${rows.length}`);
    }

    console.log('\nDone. Point Render (or local) at this DATABASE_URL and restart the server.');
}

try {
    await main();
} finally {
    sqlite.close();
    await pool.end();
}
