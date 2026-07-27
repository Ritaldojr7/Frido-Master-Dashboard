import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { normalizeEmail } from '../utils/security.js';

export const NOTIFICATION_TYPES = {
    UPLOAD: 'upload',
    ACCESS_REQUEST: 'access_request',
    USER_LOGIN: 'user_login',
};

/**
 * Record a new admin notification event.
 *
 * @param {Object} params
 * @param {'upload'|'access_request'|'user_login'} params.type
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.actorEmail]
 * @param {string} [params.actorName]
 * @param {Object} [params.metadata]
 */
export async function createNotification({
    type,
    title,
    message,
    actorEmail = '',
    actorName = '',
    metadata = {},
}) {
    if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
        console.warn(`[notificationService] Invalid notification type '${type}', falling back to 'upload'`);
        type = NOTIFICATION_TYPES.UPLOAD;
    }

    const id = uuid();
    const createdAt = now();
    const normalizedActorEmail = normalizeEmail(actorEmail);
    const metadataStr = JSON.stringify(metadata || {});

    try {
        await db.run(
            `INSERT INTO dashboard_notifications (id, type, title, message, actor_email, actor_name, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, type, title.trim(), message.trim(), normalizedActorEmail, String(actorName || '').trim(), metadataStr, createdAt]
        );
        return { id, type, title, message, actor_email: normalizedActorEmail, actor_name: actorName, metadata, created_at: createdAt };
    } catch (err) {
        console.error('[notificationService] Failed to record notification:', err.message);
        return null;
    }
}

/**
 * Query notifications with optional filtering, limit, and offset.
 */
export async function listNotifications({ limit = 50, offset = 0, type = '', search = '' } = {}) {
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const conditions = [];
    const params = [];

    if (type && Object.values(NOTIFICATION_TYPES).includes(type)) {
        conditions.push('type = ?');
        params.push(type);
    }

    if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        conditions.push('(LOWER(title) LIKE ? OR LOWER(message) LIKE ? OR LOWER(actor_email) LIKE ? OR LOWER(actor_name) LIKE ?)');
        params.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.get(
        `SELECT COUNT(*) as total FROM dashboard_notifications ${whereClause}`,
        params
    );
    const total = countRow?.total ?? countRow?.['COUNT(*)'] ?? 0;

    const queryParams = [...params, parsedLimit, parsedOffset];
    const rows = await db.all(
        `SELECT id, type, title, message, actor_email, actor_name, metadata, created_at
         FROM dashboard_notifications
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        queryParams
    );

    const notifications = rows.map((r) => {
        let meta = {};
        try {
            meta = JSON.parse(r.metadata || '{}');
        } catch {
            meta = {};
        }
        return {
            id: r.id,
            type: r.type,
            title: r.title,
            message: r.message,
            actor_email: r.actor_email || '',
            actor_name: r.actor_name || '',
            metadata: meta,
            created_at: r.created_at,
        };
    });

    return { notifications, total, limit: parsedLimit, offset: parsedOffset };
}

/**
 * Remove duplicate login notifications.
 * Keeps the FIRST notification per user per 15-minute window and deletes the rest.
 * Returns the count of deleted duplicate rows.
 */
export async function deduplicateLoginNotifications() {
    // Step 1: Fetch all login notifications ordered by actor_email then created_at.
    const rows = await db.all(
        `SELECT id, actor_email, created_at FROM dashboard_notifications
         WHERE type = 'user_login'
         ORDER BY actor_email, created_at ASC`
    );

    if (rows.length === 0) return 0;

    const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    const idsToDelete = [];

    // Group by actor_email
    const grouped = {};
    for (const row of rows) {
        if (!grouped[row.actor_email]) grouped[row.actor_email] = [];
        grouped[row.actor_email].push(row);
    }

    // For each user, walk through their login notifications chronologically.
    // Keep the first one in each 15-min window, mark the rest for deletion.
    for (const email of Object.keys(grouped)) {
        const entries = grouped[email];
        let windowStart = null;

        for (const entry of entries) {
            const ts = new Date(entry.created_at).getTime();
            if (windowStart === null || ts - windowStart > WINDOW_MS) {
                // Start a new window — keep this entry
                windowStart = ts;
            } else {
                // Still within the same 15-min window — mark as duplicate
                idsToDelete.push(entry.id);
            }
        }
    }

    if (idsToDelete.length === 0) return 0;

    // Delete in batches of 100 to avoid very large SQL queries
    const batchSize = 100;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        await db.run(
            `DELETE FROM dashboard_notifications WHERE id IN (${placeholders})`,
            batch
        );
    }

    return idsToDelete.length;
}
