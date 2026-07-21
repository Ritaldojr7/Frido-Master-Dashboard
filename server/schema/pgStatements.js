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
            role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff', 'feedback', 'feedback_head', 'executive', 'team_lead', 'data_analyst', 'orm_lead', 'td_head')),
            department TEXT DEFAULT '',
            designation TEXT DEFAULT '',
            store_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'invited', 'disabled', 'import_pending')),
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
            audience TEXT NOT NULL DEFAULT 'retail_staff' CHECK (audience IN ('retail_staff', 'isd_nm')),
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
        `CREATE TABLE IF NOT EXISTS dashboard_defs (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            back_route TEXT NOT NULL DEFAULT '',
            metadata TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS dashboard_sections (
            id TEXT PRIMARY KEY,
            dashboard_id TEXT NOT NULL,
            stable_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            title TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT '',
            accent_color TEXT NOT NULL DEFAULT 'blue',
            FOREIGN KEY (dashboard_id) REFERENCES dashboard_defs(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS dashboard_links (
            id TEXT PRIMARY KEY,
            section_id TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            payload TEXT NOT NULL,
            FOREIGN KEY (section_id) REFERENCES dashboard_sections(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_dashboard_sections_dashboard ON dashboard_sections(dashboard_id, sort_order)`,
        `CREATE INDEX IF NOT EXISTS idx_dashboard_links_section ON dashboard_links(section_id, sort_order)`,
        `CREATE TABLE IF NOT EXISTS feedback_products (
            stable_id INTEGER PRIMARY KEY,
            sort_order INTEGER NOT NULL DEFAULT 0,
            payload TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_feedback_products_sort ON feedback_products(sort_order)`,
        `CREATE TABLE IF NOT EXISTS notice_attachments (
            id TEXT PRIMARY KEY,
            notice_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            storage_path TEXT NOT NULL,
            mime_type TEXT NOT NULL DEFAULT 'application/pdf',
            size_bytes INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_notice_attachments_notice ON notice_attachments(notice_id, sort_order)`,
        `CREATE TABLE IF NOT EXISTS order_dispute_tabs (
            gid INTEGER PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS order_dispute_tab_snapshots (
            tab_gid INTEGER PRIMARY KEY,
            headers TEXT NOT NULL DEFAULT '[]',
            rows TEXT NOT NULL DEFAULT '[]',
            row_count INTEGER NOT NULL DEFAULT 0,
            synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tab_gid) REFERENCES order_dispute_tabs(gid) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS order_dispute_sync_runs (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            status TEXT NOT NULL CHECK(status IN ('success', 'error')),
            error_message TEXT DEFAULT '',
            tabs_synced INTEGER NOT NULL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS manpower_attendance (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            agent_name TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            designation TEXT NOT NULL DEFAULT '',
            vertical TEXT NOT NULL DEFAULT '',
            morning_time TEXT,
            evening_time TEXT,
            morning_roster TEXT NOT NULL DEFAULT 'DS',
            evening_roster TEXT NOT NULL DEFAULT 'DS',
            is_lop INTEGER NOT NULL DEFAULT 0,
            total_calls INTEGER NOT NULL DEFAULT 0,
            total_sales REAL NOT NULL DEFAULT 0,
            screenshot_url TEXT,
            synced_at TEXT NOT NULL
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_manpower_attendance_date_email ON manpower_attendance(date, email)`,
        `CREATE INDEX IF NOT EXISTS idx_manpower_attendance_date ON manpower_attendance(date)`,
        `CREATE TABLE IF NOT EXISTS manpower_sync_runs (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            status TEXT NOT NULL CHECK(status IN ('success', 'error')),
            error_message TEXT DEFAULT '',
            row_counts TEXT NOT NULL DEFAULT '{}',
            warnings TEXT NOT NULL DEFAULT '[]',
            records_synced INTEGER NOT NULL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS access_requests (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            designation TEXT NOT NULL,
            department TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'staff', 'feedback', 'feedback_head', 'executive', 'team_lead', 'data_analyst', 'orm_lead', 'td_head')),
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS inventory_snapshots (
            id TEXT PRIMARY KEY,
            uploaded_by TEXT NOT NULL DEFAULT '',
            uploaded_by_email TEXT NOT NULL DEFAULT '',
            file_name TEXT NOT NULL DEFAULT '',
            sheet_name TEXT NOT NULL DEFAULT '',
            row_count INTEGER NOT NULL DEFAULT 0,
            summary TEXT NOT NULL DEFAULT '{}',
            payload TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_created ON inventory_snapshots(created_at DESC)`,
        `CREATE TABLE IF NOT EXISTS manpower_lop_records (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            agent_name TEXT NOT NULL,
            vertical_name TEXT NOT NULL,
            date_of_lop TEXT NOT NULL,
            submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
    ];
}
