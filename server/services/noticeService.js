import db, { now } from '../db.js';
import {
    createSignedDownloadUrl,
    deleteNoticePdf,
    readNoticePdfBuffer,
    uploadNoticePdf,
    validateAttachmentCount,
    validateNoticePdfFiles,
} from './noticeAttachments.js';
import { partitionAttachmentsForEmail } from '../utils/noticeAttachmentValidation.js';
import { sendStaffNoticeEmail } from './email.js';
import {
    normalizedNoticeAudience,
    recipientRolePredicateForAudience,
} from '../constants/notices.js';

const APP_URL = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');

export function parseMultipartNoticeFields(body = {}) {
    const requiresAckRaw = body.requires_ack;
    const requires_ack =
        requiresAckRaw === true ||
        requiresAckRaw === 1 ||
        requiresAckRaw === '1' ||
        String(requiresAckRaw).toLowerCase() === 'true';

    const activeRaw = body.active;
    const active =
        activeRaw === undefined ||
        activeRaw === true ||
        activeRaw === 1 ||
        activeRaw === '1' ||
        String(activeRaw).toLowerCase() === 'true';

    return {
        title: String(body.title ?? '').trim(),
        body: String(body.body ?? '').trim(),
        priority: String(body.priority ?? 'normal').trim(),
        requires_ack,
        sent_by_name: String(body.sent_by_name ?? '').trim(),
        audience: normalizedNoticeAudience(body.audience),
        cta_label: String(body.cta_label ?? '').trim(),
        cta_url: String(body.cta_url ?? '').trim(),
        starts_at: body.starts_at || null,
        ends_at: body.ends_at || null,
        active,
    };
}

export function parseKeepAttachmentIds(body) {
    const raw = body.keep_attachment_ids;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    try {
        const parsed = JSON.parse(String(raw));
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
        return String(raw)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
}

export async function fetchAttachmentsByNoticeIds(noticeIds) {
    if (!noticeIds?.length) return new Map();
    const ph = noticeIds.map(() => '?').join(', ');
    const rows = await db.all(
        `SELECT * FROM notice_attachments WHERE notice_id IN (${ph}) ORDER BY notice_id, sort_order ASC, created_at ASC`,
        noticeIds
    );
    const map = new Map();
    for (const row of rows) {
        if (!map.has(row.notice_id)) map.set(row.notice_id, []);
        map.get(row.notice_id).push(row);
    }
    return map;
}

export function attachmentDownloadPath(noticeId, attachmentId) {
    return `/api/notices/${noticeId}/attachments/${attachmentId}`;
}

export function serializeAttachments(rows) {
    return (rows || []).map((a) => ({
        id: a.id,
        file_name: a.file_name,
        mime_type: a.mime_type,
        size_bytes: Number(a.size_bytes) || 0,
        sort_order: Number(a.sort_order) || 0,
        download_url: attachmentDownloadPath(a.notice_id, a.id),
    }));
}

export function serializeNotice(row, attachmentRows = []) {
    if (!row) return row;
    const audience = normalizedNoticeAudience(row.audience);
    return {
        ...row,
        audience,
        requires_ack: Boolean(row.requires_ack),
        active: Boolean(row.active),
        attachments: serializeAttachments(attachmentRows),
    };
}

export async function insertAttachmentRow(noticeId, meta, createdAt) {
    await db.run(
        `INSERT INTO notice_attachments
         (id, notice_id, file_name, storage_path, mime_type, size_bytes, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            meta.id,
            noticeId,
            meta.file_name,
            meta.storage_path,
            meta.mime_type,
            meta.size_bytes,
            meta.sort_order,
            createdAt,
        ]
    );
    return meta;
}

export async function uploadAndInsertPdfs(noticeId, files, startSort = 0) {
    const inserted = [];
    let sort = startSort;
    for (const file of files) {
        const meta = await uploadNoticePdf(noticeId, file, sort++);
        await insertAttachmentRow(noticeId, meta, now());
        inserted.push(meta);
    }
    return inserted;
}

export async function deleteAttachmentsExcept(noticeId, keepIds) {
    const existing = await db.all(
        `SELECT id, storage_path FROM notice_attachments WHERE notice_id = ?`,
        [noticeId]
    );
    const keep = new Set(keepIds);
    for (const row of existing) {
        if (keep.has(row.id)) continue;
        await deleteNoticePdf(row.storage_path);
        await db.run(`DELETE FROM notice_attachments WHERE id = ?`, [row.id]);
    }
}

export async function deleteAllNoticeAttachments(noticeId) {
    const rows = await db.all(`SELECT storage_path FROM notice_attachments WHERE notice_id = ?`, [
        noticeId,
    ]);
    for (const row of rows) {
        await deleteNoticePdf(row.storage_path);
    }
    await db.run(`DELETE FROM notice_attachments WHERE notice_id = ?`, [noticeId]);
}

export async function prepareNoticeEmailPayload(attachmentRows) {
    const { embed, linkOnly } = partitionAttachmentsForEmail(attachmentRows);
    const embedPdfAttachments = [];
    for (const row of embed) {
        const buffer = await readNoticePdfBuffer(row.storage_path);
        embedPdfAttachments.push({
            file_name: row.file_name,
            buffer,
            mime_type: row.mime_type || 'application/octet-stream',
        });
    }
    const linkOnlyPdfLines = [];
    for (const row of linkOnly) {
        const signed = await createSignedDownloadUrl(row.storage_path);
        const url =
            signed ||
            `${APP_URL}${attachmentDownloadPath(row.notice_id, row.id)} (sign in required)`;
        linkOnlyPdfLines.push({ file_name: row.file_name, url });
    }
    return { embedPdfAttachments, linkOnlyPdfLines };
}

export function scheduleAudienceNoticeEmails(noticeRow, attachmentRows) {
    if (process.env.NOTICES_EMAIL_DISABLED === 'true' || process.env.NOTICES_EMAIL_DISABLED === '1') {
        return;
    }
    const isActive = Number(noticeRow.active) === 1 || noticeRow.active === true;
    if (!isActive) return;

    const audience = normalizedNoticeAudience(noticeRow.audience);

    void (async () => {
        let recipients = [];
        try {
            const rolePred = recipientRolePredicateForAudience(audience);
            recipients = await db.all(
                `SELECT TRIM(email) AS email, TRIM(COALESCE(name, '')) AS name FROM users
                 WHERE status = 'active'
                   AND role != 'admin'
                   AND deleted_at IS NULL
                   AND (${rolePred})
                   AND email IS NOT NULL
                   AND LENGTH(TRIM(COALESCE(email, ''))) > 0`
            );
        } catch (err) {
            console.error('[notices] Failed to load email recipients:', err.message);
            return;
        }

        let emailPayload;
        try {
            emailPayload = await prepareNoticeEmailPayload(attachmentRows);
        } catch (err) {
            console.error('[notices] Failed to prepare PDF email payload:', err.message);
            emailPayload = { embedPdfAttachments: [], linkOnlyPdfLines: [] };
        }

        let ok = 0;
        let failed = 0;
        for (const row of recipients) {
            const toEmail = row.email;
            if (!toEmail) continue;
            const toName = row.name || toEmail;
            try {
                await sendStaffNoticeEmail({
                    toEmail,
                    toName,
                    notice: noticeRow,
                    embedPdfAttachments: emailPayload.embedPdfAttachments,
                    linkOnlyPdfLines: emailPayload.linkOnlyPdfLines,
                });
                ok++;
            } catch (e) {
                failed++;
                console.error(`[notices] Staff notice email failed for ${toEmail}:`, e?.message || e);
            }
        }
        if (recipients.length) {
            console.log(
                `[notices] Email (${audience}) for "${noticeRow.title}" (${noticeRow.id}): ${ok} sent, ${failed} failed, ${recipients.length} recipients`
            );
        }
    })().catch((e) => console.error('[notices] Staff notice email job failed:', e.message));
}

export async function attachAttachmentsToNotices(notices) {
    const ids = notices.map((n) => n.id);
    const map = await fetchAttachmentsByNoticeIds(ids);
    return notices.map((n) => serializeNotice(n, map.get(n.id) || []));
}

export { validateNoticePdfFiles, validateAttachmentCount };
