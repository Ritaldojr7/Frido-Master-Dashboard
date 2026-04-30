/**
 * Postgres/SQLite-compatible DDL (single statement each for node-pg).
 */
export function schemaStatements() {
    return [
        `CREATE TABLE IF NOT EXISTS users (
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
        )`,
        `CREATE TABLE IF NOT EXISTS invite_tokens (
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
        )`,
        `CREATE TABLE IF NOT EXISTS notices (
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
        )`,
        `CREATE TABLE IF NOT EXISTS notice_receipts (
            notice_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            seen_at TEXT,
            acknowledged_at TEXT,
            dismissed_at TEXT,
            PRIMARY KEY (notice_id, user_id),
            FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
    ];
}
