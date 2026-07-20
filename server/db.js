/**
 * Database adapter.
 *
 * Local development uses SQLite by default. Production uses PostgreSQL when
 * `DATABASE_URL` is set (e.g. Supabase pooled or direct connection string).
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { createClerkClient } from '@clerk/express';
import { schemaStatements } from './schema/pgStatements.js';
import { buildPgSslConfig } from './utils/pgSsl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_DB_PATH = path.join(DATA_DIR, 'frido.db');

/** Ignore stray whitespace so empty-ish DATABASE_URL does not enable Postgres. */
const postgresUrl = String(process.env.DATABASE_URL ?? '').trim();

/** Vitest / npm test lifecycle — avoid CI `secrets: inherit` pointing tests at Supabase. */
const lifecycle = process.env.npm_lifecycle_event || '';
const runningVitestNpmScript =
    lifecycle === 'test' || lifecycle === 'test:run' || lifecycle === 'test:ui';
const vitestEnv = process.env.VITEST === 'true';

const isPostgres =
    Boolean(postgresUrl) &&
    process.env.DB_CLIENT !== 'sqlite' &&
    !runningVitestNpmScript &&
    !vitestEnv;

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
        connectionString: postgresUrl,
        ssl: buildPgSslConfig(process.env),
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
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'viewer', 'feedback', 'executive', 'team_lead')),
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
 * SQLite legacy CHECK constraints — allow role `feedback` when missing from older schemas.
 */
function migrateSqliteUsersRoleFeedbackCheck() {
    if (isPostgres) return;

    const row = sqlite
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
        .get();

    if (!row?.sql || row.sql.includes("'feedback'")) return;

    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec(`
        ALTER TABLE users RENAME TO users_old;

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'viewer', 'feedback', 'executive', 'team_lead')),
            department TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled')),
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        INSERT INTO users (
            id, email, name, password_hash, role, department, store_name, avatar_url, status, last_login, created_at, updated_at, deleted_at
        )
        SELECT
            id,
            email,
            name,
            COALESCE(password_hash, ''),
            role,
            COALESCE(department, ''),
            COALESCE(store_name, ''),
            COALESCE(avatar_url, ''),
            status,
            last_login,
            created_at,
            updated_at,
            deleted_at
        FROM users_old;

        DROP TABLE users_old;
    `);
    sqlite.pragma('foreign_keys = ON');
}

/**
 * Widen role CHECK for ISD NM (executive / team_lead) on SQLite DBs that already allow `feedback`.
 */
function migrateSqliteUsersRoleWidenIsdNm() {
    if (isPostgres) return;

    const row = sqlite
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
        .get();

    if (!row?.sql || row.sql.includes("'team_lead'")) return;

    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec(`
        ALTER TABLE users RENAME TO users_old;

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'viewer', 'feedback', 'executive', 'team_lead')),
            department TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled')),
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        INSERT INTO users (
            id, email, name, password_hash, role, department, store_name, avatar_url, status, last_login, created_at, updated_at, deleted_at
        )
        SELECT
            id,
            email,
            name,
            COALESCE(password_hash, ''),
            role,
            COALESCE(department, ''),
            COALESCE(store_name, ''),
            COALESCE(avatar_url, ''),
            status,
            last_login,
            created_at,
            updated_at,
            deleted_at
        FROM users_old;

        DROP TABLE users_old;
    `);
    sqlite.pragma('foreign_keys = ON');
}

/**
 * Widen users.status CHECK to allow staged CSV imports (`import_pending`) before Clerk invite.
 */
function migrateSqliteUsersStatusImportPending() {
    if (isPostgres) return;

    const row = sqlite
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
        .get();

    if (!row?.sql || row.sql.includes("'import_pending'")) return;

    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec(`
        ALTER TABLE users RENAME TO users_old;

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'viewer', 'feedback', 'executive', 'team_lead')),
            department TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled', 'import_pending')),
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        INSERT INTO users (
            id, email, name, password_hash, role, department, store_name, avatar_url, status, last_login, created_at, updated_at, deleted_at
        )
        SELECT
            id,
            email,
            name,
            COALESCE(password_hash, ''),
            role,
            COALESCE(department, ''),
            COALESCE(store_name, ''),
            COALESCE(avatar_url, ''),
            status,
            last_login,
            created_at,
            updated_at,
            deleted_at
        FROM users_old;

        DROP TABLE users_old;
    `);
    sqlite.pragma('foreign_keys = ON');
}

/** Widen role CHECK for `data_analyst` on SQLite. */
function migrateSqliteUsersRoleDataAnalyst() {
    if (isPostgres) return;

    const row = sqlite
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
        .get();

    if (!row?.sql || row.sql.includes("'data_analyst'")) return;

    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec(`
        ALTER TABLE users RENAME TO users_old;

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'feedback', 'executive', 'team_lead', 'data_analyst')),
            roles TEXT NOT NULL DEFAULT '[]',
            department TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled', 'import_pending')),
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        INSERT INTO users (
            id, email, name, password_hash, role, roles, department, store_name, avatar_url, status, last_login, created_at, updated_at, deleted_at
        )
        SELECT
            id,
            email,
            name,
            COALESCE(password_hash, ''),
            role,
            COALESCE(roles, '[]'),
            COALESCE(department, ''),
            COALESCE(store_name, ''),
            COALESCE(avatar_url, ''),
            status,
            last_login,
            created_at,
            updated_at,
            deleted_at
        FROM users_old;

        DROP TABLE users_old;
    `);
    sqlite.pragma('foreign_keys = ON');
}

/** Widen role CHECK for `orm_lead` on SQLite. */
function migrateSqliteUsersRoleOrmLead() {
    if (isPostgres) return;

    const row = sqlite
        .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
        .get();

    if (!row?.sql || row.sql.includes("'orm_lead'")) return;

    sqlite.pragma('foreign_keys = OFF');
    sqlite.exec(`
        ALTER TABLE users RENAME TO users_old;

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'feedback', 'executive', 'team_lead', 'data_analyst', 'orm_lead')),
            roles TEXT NOT NULL DEFAULT '[]',
            department TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled', 'import_pending')),
            last_login TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );

        INSERT INTO users (
            id, email, name, password_hash, role, roles, department, store_name, avatar_url, status, last_login, created_at, updated_at, deleted_at
        )
        SELECT
            id,
            email,
            name,
            COALESCE(password_hash, ''),
            role,
            COALESCE(roles, '[]'),
            COALESCE(department, ''),
            COALESCE(store_name, ''),
            COALESCE(avatar_url, ''),
            status,
            last_login,
            created_at,
            updated_at,
            deleted_at
        FROM users_old;

        DROP TABLE users_old;
    `);
    sqlite.pragma('foreign_keys = ON');
}

/** Widen `users.status` CHECK for import staging on Postgres. */
async function ensurePostgresUsersStatusConstraint() {
    if (!pool) return;
    try {
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');
        await pool.query(
            `ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'invited', 'disabled', 'import_pending'))`
        );
    } catch (err) {
        console.warn('[db] Could not widen users.status CHECK constraint:', err.message);
    }
}

/**
 * Seed default admin in Clerk + DB when configured.
 * Requires CLERK_SECRET_KEY. If no Clerk user exists for DEFAULT_ADMIN_EMAIL,
 * sets DEFAULT_ADMIN_PASSWORD in the environment (never hardcode secrets).
 */
async function seedDefaultAdmin() {
    const email = String(process.env.DEFAULT_ADMIN_EMAIL ?? '').toLowerCase().trim();
    if (!email) {
        console.warn('Skipping default admin seed: DEFAULT_ADMIN_EMAIL is not set.');
        return;
    }
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

        // Sync to DB (upsert so Clerk id + admin role match locally)
        await db.run(
            `INSERT INTO users (id, email, name, password_hash, role, roles, department, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (email) DO UPDATE SET
             id = excluded.id,
             role = 'admin',
             roles = '["admin"]',
             updated_at = excluded.updated_at`,
            [clerkUserId, email, 'Admin', '', 'admin', '["admin"]', 'Technology', 'active', now(), now()]
        );
        console.log(`✓ Seeded default admin row for ${email}`);
    } catch (err) {
        console.error('Failed to seed default admin in Clerk:', err.message);
    }
}

/** Idempotent column-add for SQLite legacy DBs only (Postgres uses ensurePostgresOptionalColumns). */
async function ensureColumn(table, column, sqlDef) {
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

/**
 * Legacy SQLite DBs may lack columns present in newer schemas.
 * Postgres: omit DEFAULT '' here — empty-string defaults are interpreted inconsistently in ALTER ADD across dialects/parsers.
 */
async function ensurePostgresOptionalColumns() {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS designation TEXT');
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT NOT NULL DEFAULT '[]'");
    await pool.query('ALTER TABLE notices ADD COLUMN IF NOT EXISTS sent_by_name TEXT');
    await pool.query("ALTER TABLE notices ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'retail_staff'");
}

/** Backfill users.roles from legacy users.role — existing users keep the same access. */
async function backfillUsersRolesColumn() {
    const rows = await db.all(
        `SELECT id, role, roles FROM users WHERE roles IS NULL OR TRIM(roles) = '' OR roles = '[]'`
    );
    for (const row of rows) {
        const primary = row.role || 'staff';
        const rolesJson = JSON.stringify([primary]);
        await db.run('UPDATE users SET roles = ? WHERE id = ?', [rolesJson, row.id]);
    }
    if (rows.length > 0) {
        console.log(`✓ Backfilled users.roles for ${rows.length} user(s) from legacy role column`);
    }
}

/** Repair status of users who logged in before the verifyToken fix. */
async function backfillLoggedInUsersStatus() {
    const result = await db.run(
        `UPDATE users SET status = 'active' WHERE last_login IS NOT NULL AND status IN ('invited', 'import_pending')`
    );
    const n = result?.changes ?? result?.rowCount ?? 0;
    if (n > 0) {
        console.log(`✓ Backfilled status to 'active' for ${n} user(s) who had logged in previously`);
    }
}

/** Widen `users.role` CHECK so `feedback` invites persist on existing Postgres databases. */
async function ensurePostgresUsersRoleConstraint() {
    try {
        await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        await pool.query(
            `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff', 'feedback', 'executive', 'team_lead', 'data_analyst', 'orm_lead'))`
        );
    } catch (err) {
        console.warn('[db] Could not widen users.role CHECK constraint:', err.message);
    }
}

/** TLS misconfiguration surfaces here as an opaque stack trace — make it actionable. */
function explainIfTlsFailure(err) {
    const TLS_CODES = [
        'SELF_SIGNED_CERT_IN_CHAIN',
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'CERT_HAS_EXPIRED',
    ];
    if (!TLS_CODES.includes(err?.code)) return;

    console.error(
        `\n[db] Database TLS verification failed (${err.code}).\n` +
            '     The server certificate could not be verified against the configured trust anchor.\n' +
            '     Supabase\'s connection pooler uses a SELF-SIGNED chain, so PGSSL_VERIFY=true\n' +
            '     (Node\'s bundled CA store) will not work with it.\n\n' +
            '     Fix: Supabase Dashboard → Project Settings → Database → SSL Configuration →\n' +
            '     download the CA certificate, then set PGSSLROOTCERT to its PEM contents\n' +
            '     (or a file path) and unset PGSSL_VERIFY.\n\n' +
            '     To restore service immediately, unset PGSSL_VERIFY. The connection is then\n' +
            '     encrypted but NOT authenticated — treat that as temporary.\n'
    );
}

migrateSqliteUsersTableIfNeeded();
if (isPostgres) {
    try {
        for (const stmt of schemaStatements()) {
            await pool.query(stmt);
        }
        await ensurePostgresOptionalColumns();
        await ensurePostgresUsersRoleConstraint();
        await ensurePostgresUsersStatusConstraint();
    } catch (err) {
        // Deliberately re-thrown: a database we cannot verify must not be silently accepted.
        explainIfTlsFailure(err);
        throw err;
    }
} else {
    await db.exec(schemaStatements().join(';\n') + ';');
    await ensureColumn('users', 'deleted_at', 'TEXT');
    await ensureColumn('users', 'last_login', 'TEXT');
    await ensureColumn('users', 'store_name', "TEXT DEFAULT ''");
    await ensureColumn('users', 'designation', "TEXT DEFAULT ''");
    await ensureColumn('users', 'roles', "TEXT NOT NULL DEFAULT '[]'");
    await ensureColumn('notices', 'sent_by_name', 'TEXT DEFAULT \'\'');
    await ensureColumn('notices', 'audience', 'TEXT NOT NULL DEFAULT \'retail_staff\'');
    migrateSqliteUsersRoleFeedbackCheck();
    migrateSqliteUsersRoleWidenIsdNm();
    migrateSqliteUsersStatusImportPending();
    migrateSqliteUsersRoleDataAnalyst();
    migrateSqliteUsersRoleOrmLead();
}
await backfillUsersRolesColumn();
await backfillLoggedInUsersStatus();
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
