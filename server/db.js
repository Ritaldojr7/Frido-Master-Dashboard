/**
 * Database adapter.
 *
 * Local development uses SQLite by default. Render/production can use
 * PostgreSQL by setting DATABASE_URL. Routes use this small async API so the
 * app can run against either backend without duplicating business logic.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { createClerkClient } from '@clerk/express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'frido.db');
const isPostgres = Boolean(process.env.DATABASE_URL) && process.env.DB_CLIENT !== 'sqlite';

function toPostgresQuery(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

function now() {
    return new Date().toISOString();
}

let sqlite = null;
let pool = null;

if (isPostgres) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    });
} else {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    sqlite = new Database(process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
}

const db = {
    client: isPostgres ? 'postgres' : 'sqlite',

    async get(sql, params = []) {
        if (isPostgres) {
            const result = await pool.query(toPostgresQuery(sql), params);
            return result.rows[0] || null;
        }
        return sqlite.prepare(sql).get(...params) || null;
    },

    async all(sql, params = []) {
        if (isPostgres) {
            const result = await pool.query(toPostgresQuery(sql), params);
            return result.rows;
        }
        return sqlite.prepare(sql).all(...params);
    },

    async run(sql, params = []) {
        if (isPostgres) {
            const result = await pool.query(toPostgresQuery(sql), params);
            return { changes: result.rowCount };
        }
        return sqlite.prepare(sql).run(...params);
    },

    async exec(sql) {
        if (isPostgres) {
            await pool.query(sql);
            return;
        }
        sqlite.exec(sql);
    },
};

function createSchemaSql() {
    return `
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'viewer')),
            department TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled')),
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invite_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            email TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff',
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            invited_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notices (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'important', 'urgent')),
            requires_ack INTEGER NOT NULL DEFAULT 1,
            sent_by_name TEXT DEFAULT '',
            cta_label TEXT DEFAULT '',
            cta_url TEXT DEFAULT '',
            starts_at TEXT,
            ends_at TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notice_receipts (
            notice_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            seen_at TEXT,
            acknowledged_at TEXT,
            dismissed_at TEXT,
            PRIMARY KEY (notice_id, user_id),
            FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `;
}

function migrateSqliteUsersTableIfNeeded() {
    if (isPostgres) return;

    const row = sqlite
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
        .get();

    if (!row?.sql) return;

    const needsRoleCheckUpdate = !row.sql.includes("'staff'");
    const needsNullablePassword = row.sql.includes('password_hash TEXT NOT NULL');

    if (!needsRoleCheckUpdate && !needsNullablePassword) return;

    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec(`
        ALTER TABLE users RENAME TO users_old;

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'viewer')),
            department TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled')),
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO users (
            id, email, name, password_hash, role, department, store_name, avatar_url, status, last_login, created_at, updated_at
        )
        SELECT
            id,
            email,
            name,
            COALESCE(password_hash, ''),
            CASE WHEN role = 'viewer' THEN 'staff' ELSE role END,
            COALESCE(department, ''),
            '',
            COALESCE(avatar_url, ''),
            status,
            last_login,
            created_at,
            updated_at
        FROM users_old;

        DROP TABLE users_old;
    `);
    sqlite.pragma('foreign_keys = ON');
}

/**
 * Seed default admin in Clerk + SQLite when configured.
 * Requires CLERK_SECRET_KEY. If no Clerk user exists for DEFAULT_ADMIN_EMAIL,
 * sets DEFAULT_ADMIN_PASSWORD in the environment (never hardcode secrets).
 */
async function seedDefaultAdmin() {
    const email = (process.env.DEFAULT_ADMIN_EMAIL || 'ritwik.m@myfrido.com').toLowerCase().trim();
    const password = String(process.env.DEFAULT_ADMIN_PASSWORD ?? '').trim();

    try {
        const clerkSecret = process.env.CLERK_SECRET_KEY;
        if (!clerkSecret?.trim()) {
            console.warn('Skipping default admin Clerk seed: CLERK_SECRET_KEY is not set.');
            return;
        }

        const clerkClient = createClerkClient({ secretKey: clerkSecret });
        const { data: users } = await clerkClient.users.getUserList({ emailAddress: [email] });

        let clerkUserId;

        if (users.length === 0) {
            if (!password) {
                console.warn(
                    `Skipping Clerk admin creation for ${email}: set DEFAULT_ADMIN_PASSWORD (empty or unset).`
                );
                return;
            }
            console.log(`Creating default admin in Clerk: ${email}`);
            const newUser = await clerkClient.users.createUser({
                emailAddress: [email],
                password,
                publicMetadata: { role: 'admin' },
                skipPasswordRequirement: true,
                skipPasswordChecks: true,
            });
            clerkUserId = newUser.id;
        } else {
            clerkUserId = users[0].id;
            // Force update metadata if they were previously created as staff
            if (users[0].publicMetadata?.role !== 'admin') {
                console.log(`Updating existing default admin role in Clerk to admin: ${email}`);
                await clerkClient.users.updateUserMetadata(clerkUserId, {
                    publicMetadata: { role: 'admin' }
                });
            }
        }

        // Sync to SQLite (upsert to ensure role is updated locally too)
        await db.run(
            `INSERT INTO users (id, email, name, password_hash, role, department, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (email) DO UPDATE SET
             id = excluded.id,
             role = 'admin',
             updated_at = excluded.updated_at`,
            [clerkUserId, email, 'Admin', '', 'admin', 'Technology', 'active', now(), now()]
        );
        console.log(`✓ Seeded default admin row for ${email}`);
    } catch (err) {
        console.error('Failed to seed default admin in Clerk:', err.message);
    }
}

/**
 * Idempotent column-add for both SQLite and Postgres.
 */
async function ensureColumn(table, column, sqlDef) {
    if (isPostgres) {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${sqlDef}`);
        return;
    }
    const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === column)) {
        sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlDef}`);
    }
}

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PURGE_AFTER_DAYS = 30;

async function purgeExpiredDeletedUsers() {
    const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const result = await db.run(
        'DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < ?',
        [cutoff]
    );
    const n = result?.changes ?? result?.rowCount ?? 0;
    if (n > 0) {
        console.log(`✓ Purged ${n} user row(s) deleted more than ${PURGE_AFTER_DAYS} days ago`);
    }
}

migrateSqliteUsersTableIfNeeded();
await db.exec(createSchemaSql());
await ensureColumn('users', 'deleted_at', 'TEXT');
await ensureColumn('users', 'last_login', 'TEXT');
await ensureColumn('users', 'store_name', 'TEXT DEFAULT ""');
await ensureColumn('notices', 'sent_by_name', 'TEXT DEFAULT \'\'');
await seedDefaultAdmin();
await purgeExpiredDeletedUsers();

setInterval(() => {
    purgeExpiredDeletedUsers().catch((err) => console.error('Purge job failed:', err));
}, PURGE_INTERVAL_MS).unref();

/** Close PG pool / SQLite when running one-shot CLI scripts */
let dbShutdown = false;
export async function shutdownDb() {
    if (dbShutdown) return;
    dbShutdown = true;
    if (pool) {
        await pool.end();
    }
    if (sqlite) {
        sqlite.close();
    }
}

export { now };
export default db;
