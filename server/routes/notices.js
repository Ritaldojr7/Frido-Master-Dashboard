import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { noticePdfUpload } from '../middleware/noticeUpload.js';
import {
    NOTICE_AUDIENCE_RETAIL,
    normalizedNoticeAudience,
    sqlNoticesAudienceMatchesUser,
    recipientRolePredicateForAudience,
} from '../constants/notices.js';
import {
    attachAttachmentsToNotices,
    deleteAllNoticeAttachments,
    deleteAttachmentsExcept,
    fetchAttachmentsByNoticeIds,
    parseKeepAttachmentIds,
    parseMultipartNoticeFields,
    scheduleAudienceNoticeEmails,
    serializeNotice,
    uploadAndInsertPdfs,
    validateAttachmentCount,
    validateNoticePdfFiles,
} from '../services/noticeService.js';
import { readNoticePdfBuffer } from '../services/noticeAttachments.js';

export { NOTICE_AUDIENCE_RETAIL, NOTICE_AUDIENCE_ISD_NM } from '../constants/notices.js';
export { normalizedNoticeAudience } from '../constants/notices.js';

const router = Router();

router.use(verifyToken);

async function markReceipt(noticeId, userId, fields) {
    const existing = await db.get(
        'SELECT notice_id FROM notice_receipts WHERE notice_id = ? AND user_id = ?',
        [noticeId, userId]
    );

    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
        updates.push(`${key} = COALESCE(${key}, ?)`);
        values.push(value);
    }

    if (existing) {
        await db.run(
            `UPDATE notice_receipts SET ${updates.join(', ')} WHERE notice_id = ? AND user_id = ?`,
            [...values, noticeId, userId]
        );
        return;
    }

    await db.run(
        `INSERT INTO notice_receipts (notice_id, user_id, seen_at, acknowledged_at, dismissed_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
            noticeId,
            userId,
            fields.seen_at || null,
            fields.acknowledged_at || null,
            fields.dismissed_at || null,
        ]
    );
}

async function userCanAccessNotice(user, noticeId) {
    if (user.roles?.includes?.('admin') || user.role === 'admin') return true;
    const audiencePred = sqlNoticesAudienceMatchesUser(user);
    const row = await db.get(
        `SELECT n.id FROM notices n WHERE n.id = ? AND (${audiencePred})`,
        [noticeId]
    );
    return Boolean(row);
}

router.get('/active', async (req, res) => {
    const current = now();
    const audienceWhere = sqlNoticesAudienceMatchesUser(req.user);
    const notices = await db.all(
        `SELECT
            n.*,
            COALESCE(NULLIF(n.sent_by_name, ''), NULLIF(creator.name, ''), creator.email, 'Frido Admin') AS sender_name,
            r.seen_at,
            r.acknowledged_at,
            r.dismissed_at
         FROM notices n
         LEFT JOIN users creator ON creator.id = n.created_by
         LEFT JOIN notice_receipts r ON r.notice_id = n.id AND r.user_id = ?
         WHERE n.active = 1
           AND (${audienceWhere})
           AND (n.starts_at IS NULL OR n.starts_at <= ?)
           AND (n.ends_at IS NULL OR n.ends_at >= ?)
           AND r.acknowledged_at IS NULL
           AND (n.requires_ack = 1 OR r.dismissed_at IS NULL)
         ORDER BY
           CASE n.priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END,
           n.created_at DESC`,
        [req.user.id, current, current]
    );

    for (const notice of notices) {
        if (!notice.seen_at) {
            await markReceipt(notice.id, req.user.id, { seen_at: current });
        }
    }

    const withAttachments = await attachAttachmentsToNotices(notices);
    res.json({ notices: withAttachments });
});

router.get('/feed', async (req, res) => {
    const audienceWhere = sqlNoticesAudienceMatchesUser(req.user);
    const notices = await db.all(
        `SELECT
            n.*,
            COALESCE(NULLIF(n.sent_by_name, ''), NULLIF(creator.name, ''), creator.email, 'Frido Admin') AS sender_name,
            r.seen_at,
            r.acknowledged_at,
            r.dismissed_at
         FROM notices n
         LEFT JOIN users creator ON creator.id = n.created_by
         LEFT JOIN notice_receipts r ON r.notice_id = n.id AND r.user_id = ?
         WHERE (${audienceWhere})
         ORDER BY n.created_at DESC`,
        [req.user.id]
    );

    const withAttachments = await attachAttachmentsToNotices(notices);
    res.json({ notices: withAttachments });
});

router.post('/:id/ack', async (req, res) => {
    const audiencePred = sqlNoticesAudienceMatchesUser(req.user);
    const notice = await db.get(
        `SELECT n.id FROM notices n WHERE n.id = ? AND n.active = 1 AND (${audiencePred})`,
        [req.params.id]
    );
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    const current = now();
    await markReceipt(req.params.id, req.user.id, { seen_at: current, acknowledged_at: current });

    res.json({ message: 'Notice acknowledged' });
});

router.post('/:id/dismiss', async (req, res) => {
    const audiencePred = sqlNoticesAudienceMatchesUser(req.user);
    const notice = await db.get(
        `SELECT n.id FROM notices n WHERE n.id = ? AND n.active = 1 AND (${audiencePred})`,
        [req.params.id]
    );
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    const current = now();
    await markReceipt(req.params.id, req.user.id, { seen_at: current, dismissed_at: current });

    res.json({ message: 'Notice dismissed' });
});

router.get('/admin', requireRole(['admin']), async (_req, res) => {
    const notices = await db.all(
        `SELECT n.*,
                COALESCE(NULLIF(n.sent_by_name, ''), NULLIF(creator.name, ''), creator.email, 'Frido Admin') AS sender_name,
                creator.name AS created_by_name,
                COUNT(r.user_id) AS seen_count,
                COUNT(r.acknowledged_at) AS acknowledged_count
         FROM notices n
         LEFT JOIN users creator ON creator.id = n.created_by
         LEFT JOIN notice_receipts r ON r.notice_id = n.id
         GROUP BY n.id, creator.id, creator.name, creator.email
         ORDER BY n.created_at DESC`
    );

    const withAttachments = await attachAttachmentsToNotices(notices);
    res.json({ notices: withAttachments });
});

router.post('/admin', requireRole(['admin']), noticePdfUpload.array('pdfs', 5), async (req, res) => {
    try {
        const fields = parseMultipartNoticeFields(req.body);
        if (!fields.title || !fields.body) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const fileCheck = validateNoticePdfFiles(req.files || []);
        if (!fileCheck.ok) {
            return res.status(400).json({ error: fileCheck.error });
        }

        const validPriorities = ['normal', 'important', 'urgent'];
        const creator = await db.get('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
        const resolvedSenderName =
            fields.sent_by_name ||
            creator?.name?.trim() ||
            creator?.email?.trim() ||
            req.user.name?.trim() ||
            req.user.email?.trim() ||
            'Frido Admin';

        const noticeId = uuid();
        const createdAt = now();
        const notice = {
            id: noticeId,
            title: fields.title,
            body: fields.body,
            priority: validPriorities.includes(fields.priority) ? fields.priority : 'normal',
            requires_ack: fields.requires_ack ? 1 : 0,
            sent_by_name: resolvedSenderName,
            audience: fields.audience,
            cta_label: fields.cta_label,
            cta_url: fields.cta_url,
            starts_at: fields.starts_at,
            ends_at: fields.ends_at,
            active: fields.active ? 1 : 0,
            created_by: req.user.id,
            created_at: createdAt,
            updated_at: createdAt,
        };

        await db.run(
            `INSERT INTO notices (
                id, title, body, priority, requires_ack, sent_by_name, audience, cta_label, cta_url,
                starts_at, ends_at, active, created_by, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                notice.id,
                notice.title,
                notice.body,
                notice.priority,
                notice.requires_ack,
                notice.sent_by_name,
                notice.audience,
                notice.cta_label,
                notice.cta_url,
                notice.starts_at,
                notice.ends_at,
                notice.active,
                notice.created_by,
                notice.created_at,
                notice.updated_at,
            ]
        );

        await uploadAndInsertPdfs(noticeId, fileCheck.files, 0);
        const attachmentRows =
            (await fetchAttachmentsByNoticeIds([noticeId])).get(noticeId) || [];
        scheduleAudienceNoticeEmails(notice, attachmentRows);

        res.status(201).json({ notice: serializeNotice(notice, attachmentRows) });
    } catch (err) {
        console.error('[notices] POST admin', err);
        res.status(500).json({ error: err.message || 'Failed to publish notice' });
    }
});

router.put('/admin/:id', requireRole(['admin']), noticePdfUpload.array('pdfs', 5), async (req, res) => {
    try {
        const existing = await db.get('SELECT * FROM notices WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Notice not found' });
        }

        const fields = parseMultipartNoticeFields(req.body);
        if (!fields.title || !fields.body) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const fileCheck = validateNoticePdfFiles(req.files || []);
        if (!fileCheck.ok) {
            return res.status(400).json({ error: fileCheck.error });
        }

        const keepIds = parseKeepAttachmentIds(req.body);
        const currentAttachments = await db.all(
            `SELECT id FROM notice_attachments WHERE notice_id = ?`,
            [req.params.id]
        );
        const validKeep = keepIds.filter((id) => currentAttachments.some((r) => r.id === id));
        const countCheck = validateAttachmentCount(
            currentAttachments.length,
            fileCheck.files.length,
            validKeep.length
        );
        if (!countCheck.ok) {
            return res.status(400).json({ error: countCheck.error });
        }

        const validPriorities = ['normal', 'important', 'urgent'];
        const creator = await db.get('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
        const resolvedSenderName =
            fields.sent_by_name ||
            creator?.name?.trim() ||
            creator?.email?.trim() ||
            req.user.name?.trim() ||
            req.user.email?.trim() ||
            'Frido Admin';

        const updatedAt = now();
        await db.run(
            `UPDATE notices SET
                title = ?, body = ?, priority = ?, requires_ack = ?, sent_by_name = ?, audience = ?,
                cta_label = ?, cta_url = ?, starts_at = ?, ends_at = ?, active = ?, updated_at = ?
             WHERE id = ?`,
            [
                fields.title,
                fields.body,
                validPriorities.includes(fields.priority) ? fields.priority : 'normal',
                fields.requires_ack ? 1 : 0,
                resolvedSenderName,
                fields.audience,
                fields.cta_label,
                fields.cta_url,
                fields.starts_at,
                fields.ends_at,
                fields.active ? 1 : 0,
                updatedAt,
                req.params.id,
            ]
        );

        await deleteAttachmentsExcept(req.params.id, validKeep);
        const remaining = await db.all(
            `SELECT id, sort_order FROM notice_attachments WHERE notice_id = ? ORDER BY sort_order`,
            [req.params.id]
        );
        const nextSort =
            remaining.length > 0
                ? Math.max(...remaining.map((r) => Number(r.sort_order) || 0)) + 1
                : 0;
        await uploadAndInsertPdfs(req.params.id, fileCheck.files, nextSort);

        await db.run('DELETE FROM notice_receipts WHERE notice_id = ?', [req.params.id]);

        const notice = await db.get('SELECT * FROM notices WHERE id = ?', [req.params.id]);
        const attachmentRows =
            (await fetchAttachmentsByNoticeIds([req.params.id])).get(req.params.id) || [];
        scheduleAudienceNoticeEmails(notice, attachmentRows);

        res.json({ notice: serializeNotice(notice, attachmentRows) });
    } catch (err) {
        console.error('[notices] PUT admin', err);
        res.status(500).json({ error: err.message || 'Failed to update notice' });
    }
});

router.put('/admin/:id/status', requireRole(['admin']), async (req, res) => {
    const active = req.body.active ? 1 : 0;
    await db.run('UPDATE notices SET active = ?, updated_at = ? WHERE id = ?', [active, now(), req.params.id]);
    const notice = await db.get('SELECT * FROM notices WHERE id = ?', [req.params.id]);

    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    const attachmentRows =
        (await fetchAttachmentsByNoticeIds([req.params.id])).get(req.params.id) || [];
    res.json({ notice: serializeNotice(notice, attachmentRows) });
});

router.delete('/admin/:id', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    await deleteAllNoticeAttachments(req.params.id);
    await db.run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
});

router.post('/admin/:id/delete', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    await deleteAllNoticeAttachments(req.params.id);
    await db.run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
});

router.delete('/:id', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }
    await deleteAllNoticeAttachments(req.params.id);
    await db.run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
});

router.post('/:id/delete', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }
    await deleteAllNoticeAttachments(req.params.id);
    await db.run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
});

router.get('/admin/:id/stats', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT * FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    const recipients = await db.all(
        `SELECT u.id, u.email, u.name, u.role, r.seen_at, r.acknowledged_at, r.dismissed_at
         FROM users u
         LEFT JOIN notice_receipts r ON r.user_id = u.id AND r.notice_id = ?
         WHERE u.status = 'active'
           AND u.role != 'admin'
           AND u.deleted_at IS NULL
           AND (${recipientRolePredicateForAudience(normalizedNoticeAudience(notice.audience))})
         ORDER BY u.name`,
        [req.params.id]
    );

    const attachmentRows =
        (await fetchAttachmentsByNoticeIds([req.params.id])).get(req.params.id) || [];
    res.json({ notice: serializeNotice(notice, attachmentRows), recipients });
});

router.get('/:noticeId/attachments/:attachmentId', async (req, res) => {
    const { noticeId, attachmentId } = req.params;
    const allowed = await userCanAccessNotice(req.user, noticeId);
    if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const row = await db.get(
        `SELECT na.* FROM notice_attachments na
         INNER JOIN notices n ON n.id = na.notice_id
         WHERE na.id = ? AND na.notice_id = ?`,
        [attachmentId, noticeId]
    );
    if (!row) {
        return res.status(404).json({ error: 'Attachment not found' });
    }

    try {
        const buffer = await readNoticePdfBuffer(row.storage_path);
        res.setHeader('Content-Type', row.mime_type || 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(row.file_name || 'notice-attachment')}"`
        );
        res.send(buffer);
    } catch (err) {
        console.error('[notices] download', err.message);
        res.status(404).json({ error: 'Attachment file not found' });
    }
});

export default router;
