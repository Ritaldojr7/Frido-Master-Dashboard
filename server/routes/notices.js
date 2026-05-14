import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { sendStaffNoticeEmail } from '../services/email.js';

const router = Router();

export const NOTICE_AUDIENCE_RETAIL = 'retail_staff';
export const NOTICE_AUDIENCE_ISD_NM = 'isd_nm';

/** Normalise POST body audience; defaults to retail staff. */
export function normalizedNoticeAudience(raw) {
    const a = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (a === 'isd_nm' || a === 'isdnm') return NOTICE_AUDIENCE_ISD_NM;
    return NOTICE_AUDIENCE_RETAIL;
}

/** SQL snippet: notices visible to this dashboard role (`staff`/`viewer` vs `executive`/`team_lead`). */
function sqlNoticesAudienceMatchesUser(role) {
    const r = String(role || '');
    if (r === 'staff' || r === 'viewer') {
        return "(COALESCE(n.audience, 'retail_staff') = 'retail_staff')";
    }
    if (r === 'executive' || r === 'team_lead') {
        return `(COALESCE(n.audience, 'retail_staff') = '${NOTICE_AUDIENCE_ISD_NM}')`;
    }
    return '(1 = 0)';
}

/** WHERE fragment for counting email recipients */
function recipientRolePredicateForAudience(audience) {
    return audience === NOTICE_AUDIENCE_ISD_NM
        ? "role IN ('executive', 'team_lead')"
        : "role IN ('staff', 'viewer')";
}

/**
 * Email active recipients for this notice audience a copy via Microsoft Graph. Runs async so POST /admin returns quickly.
 * Requires the same Microsoft Graph env vars as invitations (see graphEmail.js). Set NOTICES_EMAIL_DISABLED=1 to skip.
 */
function scheduleAudienceNoticeEmails(noticeRow) {
    if (process.env.NOTICES_EMAIL_DISABLED === 'true' || process.env.NOTICES_EMAIL_DISABLED === '1') {
        return;
    }
    const isActive =
        Number(noticeRow.active) === 1 || noticeRow.active === true;
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

        let ok = 0;
        let failed = 0;
        for (const row of recipients) {
            const toEmail = row.email;
            if (!toEmail) continue;
            const toName = row.name || toEmail;
            try {
                await sendStaffNoticeEmail({ toEmail, toName, notice: noticeRow });
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

router.use(verifyToken);

function serializeNotice(row) {
    if (!row) return row;
    const audience = normalizedNoticeAudience(row.audience);
    return {
        ...row,
        audience,
        requires_ack: Boolean(row.requires_ack),
        active: Boolean(row.active),
    };
}

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

router.get('/active', async (req, res) => {
    const current = now();
    const audienceWhere = sqlNoticesAudienceMatchesUser(req.user.role);
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

    res.json({ notices: notices.map(serializeNotice) });
});

router.get('/feed', async (req, res) => {
    const audienceWhere = sqlNoticesAudienceMatchesUser(req.user.role);
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

    res.json({ notices: notices.map(serializeNotice) });
});

router.post('/:id/ack', async (req, res) => {
    const audiencePred = sqlNoticesAudienceMatchesUser(req.user.role);
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
    const audiencePred = sqlNoticesAudienceMatchesUser(req.user.role);
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

    res.json({ notices: notices.map(serializeNotice) });
});

router.post('/admin', requireRole(['admin']), async (req, res) => {
    const {
        title,
        body,
        priority = 'normal',
        requires_ack = true,
        sent_by_name = '',
        audience: audienceRaw = NOTICE_AUDIENCE_RETAIL,
        cta_label = '',
        cta_url = '',
        starts_at = null,
        ends_at = null,
        active = true,
    } = req.body;

    if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ error: 'Title and message are required' });
    }

    const audience = normalizedNoticeAudience(audienceRaw);

    const validPriorities = ['normal', 'important', 'urgent'];
    const creator = await db.get('SELECT name, email FROM users WHERE id = ?', [req.user.id]);
    const resolvedSenderName =
        sent_by_name?.trim() ||
        creator?.name?.trim() ||
        creator?.email?.trim() ||
        req.user.name?.trim() ||
        req.user.email?.trim() ||
        'Frido Admin';

    const notice = {
        id: uuid(),
        title: title.trim(),
        body: body.trim(),
        priority: validPriorities.includes(priority) ? priority : 'normal',
        requires_ack: requires_ack ? 1 : 0,
        sent_by_name: resolvedSenderName,
        audience,
        cta_label: cta_label?.trim() || '',
        cta_url: cta_url?.trim() || '',
        starts_at: starts_at || null,
        ends_at: ends_at || null,
        active: active ? 1 : 0,
        created_by: req.user.id,
        created_at: now(),
        updated_at: now(),
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

    scheduleAudienceNoticeEmails(notice);

    res.status(201).json({ notice: serializeNotice(notice) });
});

router.put('/admin/:id/status', requireRole(['admin']), async (req, res) => {
    const active = req.body.active ? 1 : 0;
    await db.run('UPDATE notices SET active = ?, updated_at = ? WHERE id = ?', [active, now(), req.params.id]);
    const notice = await db.get('SELECT * FROM notices WHERE id = ?', [req.params.id]);

    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    res.json({ notice: serializeNotice(notice) });
});

router.delete('/admin/:id', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    await db.run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
});

// Compatibility endpoint for environments where DELETE routes are blocked/cached.
router.post('/admin/:id/delete', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }

    await db.run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
});

// Backward-compatible endpoints for older frontend/backend route conventions.
router.delete('/:id', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }
    await db.run('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notice deleted successfully' });
});

router.post('/:id/delete', requireRole(['admin']), async (req, res) => {
    const notice = await db.get('SELECT id FROM notices WHERE id = ?', [req.params.id]);
    if (!notice) {
        return res.status(404).json({ error: 'Notice not found' });
    }
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

    res.json({ notice: serializeNotice(notice), recipients });
});

export default router;
