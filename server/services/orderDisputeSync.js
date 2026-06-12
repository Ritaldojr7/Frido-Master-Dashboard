/**
 * Order Dispute: Google Sheets → Supabase sync and DB read path.
 */
import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { fetchOrderDisputeSheets, googleSheetsConfigured } from './googleSheets.js';

export const ORDER_DISPUTE_SYNC_MS = Number(process.env.ORDER_DISPUTE_SYNC_MS ?? 60_000);

let syncInProgress = false;
let schedulerStarted = false;

function parseJsonArray(value, fallback = []) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return fallback;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function parseJsonRows(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function upsertTabMeta(gid, title, sortOrder, iso) {
    await db.run(
        `INSERT INTO order_dispute_tabs (gid, title, sort_order, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(gid) DO UPDATE SET
            title = excluded.title,
            sort_order = excluded.sort_order,
            updated_at = excluded.updated_at`,
        [gid, title, sortOrder, iso]
    );
}

async function replaceSnapshot(tabGid, headers, rows, iso) {
    const headersJson = JSON.stringify(headers ?? []);
    const rowsJson = JSON.stringify(rows ?? []);
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    await db.run(
        `INSERT INTO order_dispute_tab_snapshots (tab_gid, headers, rows, row_count, synced_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(tab_gid) DO UPDATE SET
            headers = excluded.headers,
            rows = excluded.rows,
            row_count = excluded.row_count,
            synced_at = excluded.synced_at`,
        [tabGid, headersJson, rowsJson, rowCount, iso]
    );
}

async function insertSyncRun(id, startedAt, status, tabsSynced, errorMessage, finishedAt) {
    await db.run(
        `INSERT INTO order_dispute_sync_runs (id, started_at, finished_at, status, error_message, tabs_synced)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, startedAt, finishedAt ?? null, status, errorMessage ?? '', tabsSynced ?? 0]
    );
}

/**
 * Pull both sheet tabs via Google Sheets API and store snapshots in Postgres/SQLite.
 * @returns {Promise<{ ok?: boolean, skipped?: boolean, reason?: string, tabsSynced?: number, syncedAt?: string, error?: string }>}
 */
export async function syncOrderDisputeFromSheets() {
    if (syncInProgress) {
        return { skipped: true, reason: 'sync_in_progress' };
    }
    if (!googleSheetsConfigured()) {
        return { skipped: true, reason: 'not_configured' };
    }

    syncInProgress = true;
    const runId = uuid();
    const startedAt = now();

    try {
        const fetched = await fetchOrderDisputeSheets();
        const iso = now();
        let tabsSynced = 0;

        for (const [index, tab] of (fetched.tabs ?? []).entries()) {
            const gid = Number(tab.gid);
            if (!Number.isFinite(gid)) continue;
            await upsertTabMeta(gid, tab.title ?? `Sheet ${gid}`, index, iso);
            await replaceSnapshot(gid, tab.headers ?? [], tab.rows ?? [], iso);
            tabsSynced += 1;
        }

        await insertSyncRun(runId, startedAt, 'success', tabsSynced, '', iso);

        return {
            ok: true,
            tabsSynced,
            syncedAt: iso,
            spreadsheetId: fetched.spreadsheetId,
        };
    } catch (err) {
        const message = err.message || 'Sync failed';
        await insertSyncRun(runId, startedAt, 'error', 0, message, now()).catch((logErr) => {
            console.error('[order-dispute] Failed to log sync run:', logErr);
        });
        throw err;
    } finally {
        syncInProgress = false;
    }
}

/**
 * Load tab snapshots from DB for dashboard API (no Google call).
 */
export async function loadOrderDisputeFromDb() {
    const rows = await db.all(
        `SELECT t.gid, t.title, t.sort_order, s.headers, s.rows, s.synced_at
         FROM order_dispute_tabs t
         LEFT JOIN order_dispute_tab_snapshots s ON s.tab_gid = t.gid
         ORDER BY t.sort_order ASC, t.gid ASC`
    );

    let latestSyncedAt = null;
    const tabs = (rows ?? []).map((row) => {
        const syncedAt = row.synced_at ?? null;
        if (syncedAt && (!latestSyncedAt || syncedAt > latestSyncedAt)) {
            latestSyncedAt = syncedAt;
        }
        return {
            gid: row.gid,
            title: row.title,
            headers: parseJsonArray(row.headers),
            rows: parseJsonRows(row.rows),
            syncedAt,
        };
    });

    return {
        tabs,
        syncedAt: latestSyncedAt,
    };
}

/**
 * Sync health for GET /api/order-disputes/status
 */
export async function getOrderDisputeSyncStatus() {
    const lastRun = await db.get(
        `SELECT status, error_message, finished_at, started_at, tabs_synced
         FROM order_dispute_sync_runs
         ORDER BY started_at DESC
         LIMIT 1`
    );

    const latestSnapshot = await db.get(
        `SELECT MAX(synced_at) AS synced_at FROM order_dispute_tab_snapshots`
    );

    const lastSyncedAt = latestSnapshot?.synced_at ?? null;

    return {
        configured: googleSheetsConfigured(),
        syncIntervalMs: ORDER_DISPUTE_SYNC_MS,
        lastSyncedAt,
        lastSyncStatus: lastRun?.status ?? null,
        syncError: lastRun?.status === 'error' ? lastRun.error_message || 'Sync failed' : null,
        lastSyncAt: lastRun?.finished_at ?? lastRun?.started_at ?? null,
        tabsSynced: lastRun?.tabs_synced ?? 0,
    };
}

/** Background sync on server boot + interval. */
export function startOrderDisputeSyncScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;

    if (!googleSheetsConfigured()) {
        console.log('[order-dispute] Sync scheduler skipped — GOOGLE_SERVICE_ACCOUNT_JSON not set');
        return;
    }

    const tick = () => {
        syncOrderDisputeFromSheets().catch((err) => {
            console.error('[order-dispute] Scheduled sync failed:', err.message || err);
        });
    };

    console.log(`[order-dispute] Sync scheduler started (every ${ORDER_DISPUTE_SYNC_MS}ms)`);
    tick();
    setInterval(tick, ORDER_DISPUTE_SYNC_MS).unref();
}

export function isSyncAuthorized(req) {
    const secret = String(process.env.ORDER_DISPUTE_SYNC_SECRET ?? '').trim();
    if (secret) {
        const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
        const token = bearer || String(req.query.token ?? '').trim();
        if (token === secret) return true;
    }
    const user = req.user;
    if (!user) return false;
    const roles = user.roles ?? (user.role ? [user.role] : []);
    return roles.includes('admin');
}
