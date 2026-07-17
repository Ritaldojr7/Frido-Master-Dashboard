/**
 * Manpower: Google Sheets → Supabase/Postgres sync and DB read path.
 */
import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { fetchAllManpowerSheets, isManpowerConfigured } from './manpowerSheets.js';
import { transformManpowerData, normalizeKey } from './manpowerData.js';

export const MANPOWER_SYNC_MS = Number(process.env.MANPOWER_SYNC_MS ?? 300_000);

let syncInProgress = false;
let schedulerStarted = false;

const ATTENDANCE_COLUMNS = [
    'id',
    'date',
    'agent_name',
    'email',
    'designation',
    'vertical',
    'morning_time',
    'evening_time',
    'morning_roster',
    'evening_roster',
    'is_lop',
    'total_calls',
    'total_sales',
    'screenshot_url',
    'synced_at',
];

function parseJsonObject(value, fallback = {}) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return fallback;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

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

function attendanceId(record) {
    const key = normalizeKey(record.email) || normalizeKey(record.agent_name);
    return `${record.date}:${key}`;
}

function rowToAttendanceRecord(row) {
    return {
        date: row.date,
        agent_name: row.agent_name ?? '',
        email: row.email ?? '',
        designation: row.designation ?? '',
        vertical: row.vertical ?? '',
        morning_time: row.morning_time ?? null,
        evening_time: row.evening_time ?? null,
        morning_roster: row.morning_roster ?? 'DS',
        evening_roster: row.evening_roster ?? 'DS',
        is_lop: Boolean(row.is_lop),
        total_calls: Number(row.total_calls) || 0,
        total_sales: Number(row.total_sales) || 0,
        screenshot_url: row.screenshot_url ?? null,
    };
}

async function insertSyncRun(id, startedAt, status, recordsSynced, rowCounts, warnings, errorMessage, finishedAt) {
    await db.run(
        `INSERT INTO manpower_sync_runs (id, started_at, finished_at, status, error_message, row_counts, warnings, records_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            startedAt,
            finishedAt ?? null,
            status,
            errorMessage ?? '',
            JSON.stringify(rowCounts ?? {}),
            JSON.stringify(warnings ?? []),
            recordsSynced ?? 0,
        ]
    );
}

async function upsertAttendanceBatch(records, iso) {
    if (!records.length) return;

    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => `(${ATTENDANCE_COLUMNS.map(() => '?').join(', ')})`).join(', ');
        const params = [];

        for (const record of chunk) {
            params.push(
                attendanceId(record),
                record.date,
                record.agent_name ?? '',
                record.email ?? '',
                record.designation ?? '',
                record.vertical ?? '',
                record.morning_time ?? null,
                record.evening_time ?? null,
                record.morning_roster ?? 'DS',
                record.evening_roster ?? 'DS',
                record.is_lop ? 1 : 0,
                Number(record.total_calls) || 0,
                Number(record.total_sales) || 0,
                record.screenshot_url ?? null,
                iso
            );
        }

        await db.run(
            `INSERT INTO manpower_attendance (${ATTENDANCE_COLUMNS.join(', ')})
             VALUES ${placeholders}
             ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                agent_name = excluded.agent_name,
                email = excluded.email,
                designation = excluded.designation,
                vertical = excluded.vertical,
                morning_time = excluded.morning_time,
                evening_time = excluded.evening_time,
                morning_roster = excluded.morning_roster,
                evening_roster = excluded.evening_roster,
                is_lop = excluded.is_lop,
                total_calls = excluded.total_calls,
                total_sales = excluded.total_sales,
                screenshot_url = excluded.screenshot_url,
                synced_at = excluded.synced_at`,
            params
        );
    }
}

async function removeStaleAttendance(iso) {
    await db.run('DELETE FROM manpower_attendance WHERE synced_at < ?', [iso]);
}

/**
 * Pull Google Sheets tabs, transform, and persist attendance rows in Postgres/SQLite.
 */
export async function syncManpowerFromSheets() {
    if (syncInProgress) {
        return { skipped: true, reason: 'sync_in_progress' };
    }

    const spreadsheetId = String(process.env.MANPOWER_SPREADSHEET_ID ?? '').trim();
    if (!spreadsheetId || !isManpowerConfigured()) {
        return { skipped: true, reason: 'not_configured' };
    }

    syncInProgress = true;
    const runId = uuid();
    const startedAt = now();

    try {
        console.log('[manpower-sync] Starting sync from Google Sheets...');
        const fetchResult = await fetchAllManpowerSheets(spreadsheetId);
        const transformResult = transformManpowerData(fetchResult.data);
        const warnings = [...(fetchResult.warnings ?? []), ...(transformResult.warnings ?? [])];
        const iso = fetchResult.fetchedAt || now();

        await upsertAttendanceBatch(transformResult.attendance ?? [], iso);
        await removeStaleAttendance(iso);
        await insertSyncRun(
            runId,
            startedAt,
            'success',
            transformResult.attendance?.length ?? 0,
            fetchResult.rowCounts ?? {},
            warnings,
            '',
            iso
        );

        console.log('[manpower-sync] Sync completed successfully.');
        return {
            ok: true,
            success: true,
            fetchedAt: iso,
            rowCounts: fetchResult.rowCounts ?? {},
            warningsCount: warnings.length,
            recordsSynced: transformResult.attendance?.length ?? 0,
        };
    } catch (err) {
        const message = err.message || 'Sync failed';
        await insertSyncRun(runId, startedAt, 'error', 0, {}, [], message, now()).catch((logErr) => {
            console.error('[manpower-sync] Failed to log sync run:', logErr);
        });
        throw err;
    } finally {
        syncInProgress = false;
    }
}

/**
 * Load attendance records from DB for dashboard API (no Google call).
 */
export async function loadManpowerFromDb() {
    const rows = await db.all(
        `SELECT date, agent_name, email, designation, vertical,
                morning_time, evening_time, morning_roster, evening_roster,
                is_lop, total_calls, total_sales, screenshot_url
         FROM manpower_attendance
         ORDER BY date DESC, agent_name ASC`
    );

    const lastRun = await db.get(
        `SELECT finished_at, started_at, warnings, row_counts
         FROM manpower_sync_runs
         WHERE status = 'success'
         ORDER BY finished_at DESC
         LIMIT 1`
    );

    const latestSnapshot = await db.get(
        `SELECT MAX(synced_at) AS synced_at FROM manpower_attendance`
    );

    const fetchedAt = lastRun?.finished_at ?? latestSnapshot?.synced_at ?? null;

    return {
        attendance: (rows ?? []).map(rowToAttendanceRecord),
        fetchedAt,
        warnings: parseJsonArray(lastRun?.warnings),
        rowCounts: parseJsonObject(lastRun?.row_counts),
    };
}

/**
 * Sync health for GET /api/manpower/status
 */
export async function getManpowerSyncStatus() {
    const lastRun = await db.get(
        `SELECT status, error_message, finished_at, started_at, row_counts, warnings, records_synced
         FROM manpower_sync_runs
         ORDER BY started_at DESC
         LIMIT 1`
    );

    const latestSnapshot = await db.get(
        `SELECT MAX(synced_at) AS synced_at, COUNT(*) AS record_count FROM manpower_attendance`
    );

    return {
        configured: isManpowerConfigured(),
        syncIntervalMs: MANPOWER_SYNC_MS,
        lastFetchTime: lastRun?.finished_at ?? latestSnapshot?.synced_at ?? null,
        lastSyncedAt: latestSnapshot?.synced_at ?? null,
        lastSyncStatus: lastRun?.status ?? null,
        syncError: lastRun?.status === 'error' ? lastRun.error_message || 'Sync failed' : null,
        lastSyncAt: lastRun?.finished_at ?? lastRun?.started_at ?? null,
        rowCounts: parseJsonObject(lastRun?.row_counts),
        warnings: parseJsonArray(lastRun?.warnings),
        recordsSynced: lastRun?.records_synced ?? latestSnapshot?.record_count ?? 0,
    };
}

/** Background sync on server boot + interval. */
export function startManpowerSyncScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;

    if (!isManpowerConfigured()) {
        console.log('[manpower-sync] Sync scheduler skipped — credentials or MANPOWER_SPREADSHEET_ID not set');
        return;
    }

    const tick = () => {
        syncManpowerFromSheets().catch((err) => {
            console.error('[manpower-sync] Scheduled sync failed:', err.message || err);
        });
    };

    console.log(`[manpower-sync] Sync scheduler started (every ${MANPOWER_SYNC_MS}ms)`);
    tick();
    setInterval(tick, MANPOWER_SYNC_MS).unref();
}

export function isSyncAuthorized(req) {
    const secret = String(process.env.MANPOWER_SYNC_SECRET ?? '').trim();
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
