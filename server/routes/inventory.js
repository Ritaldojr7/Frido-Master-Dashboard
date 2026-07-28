/**
 * Daily Inventory Dashboard.
 *
 * Two tiers, both enforced here rather than in the SPA:
 *   - UPLOAD  — a named allowlist (INVENTORY_UPLOADER_EMAILS), plus admins. Replacing the
 *               snapshot changes what every viewer sees, so it is a write action.
 *   - VIEW    — executives and admins.
 *
 * Hiding the upload control in React is a UX affordance, not a control; anyone could POST
 * to this endpoint directly.
 */
import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { userMutationLimiter } from '../middleware/rateLimit.js';
import { normalizeEmail } from '../utils/security.js';
import { getUserRoles } from '../utils/roles.js';
import { getInventoryUploaderEmailsServer } from '../utils/organizationEnv.js';
import { parseInventoryWorkbook, summarizeInventory } from '../utils/inventoryParser.js';
import { createNotification } from '../services/notificationService.js';

const router = Router();

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/octet-stream',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: MAX_UPLOAD_BYTES },
    fileFilter(_req, file, cb) {
        const extOk = /\.(xlsx|xls|csv)$/i.test(file.originalname || '');
        if (extOk && ALLOWED_MIMES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only .xlsx, .xls, or .csv files are accepted'));
        }
    },
});

/**
 * Upload is restricted to named people — an admin who is not on the list cannot upload
 * either. This deliberately does NOT use `hasAnyRole`, which grants admins
 * unconditionally and would quietly widen write access to the shared snapshot.
 *
 * @param {{ email?: string, roles?: string[] }} user
 */
export function canUploadInventory(user) {
    const allowlist = getInventoryUploaderEmailsServer();

    // Unconfigured allowlist falls back to admins only — never "everyone", so a missing
    // env var cannot silently open uploads, but the feature is not bricked either.
    if (allowlist.length === 0) {
        return getUserRoles(user).includes('admin');
    }

    return allowlist.includes(normalizeEmail(user?.email));
}

router.use(verifyToken);

/**
 * Viewing is open to executives, team leads and admins (requireRole admits admins).
 * The latest snapshot stays visible until someone uploads a newer one.
 */
const requireViewer = requireRole(['executive', 'team_lead']);

/**
 * GET /api/inventory/latest — newest snapshot, or null when nothing has been uploaded.
 */
router.get('/latest', requireViewer, async (req, res) => {
    try {
        const row = await db.get(
            `SELECT id, uploaded_by_email, file_name, sheet_name, row_count, summary, payload, created_at
             FROM inventory_snapshots
             ORDER BY created_at DESC
             LIMIT 1`
        );

        if (!row) {
            return res.json({ snapshot: null, canUpload: canUploadInventory(req.user) });
        }

        const parse = (value, fallback) => {
            if (value && typeof value === 'object') return value;
            try {
                return JSON.parse(value);
            } catch {
                return fallback;
            }
        };

        return res.json({
            snapshot: {
                id: row.id,
                uploadedByEmail: row.uploaded_by_email,
                fileName: row.file_name,
                sheetName: row.sheet_name,
                rowCount: row.row_count,
                summary: parse(row.summary, {}),
                records: parse(row.payload, []),
                createdAt: row.created_at,
            },
            canUpload: canUploadInventory(req.user),
        });
    } catch (err) {
        console.error('[inventory/latest]', err.message);
        return res.status(500).json({ error: 'Could not load the latest inventory snapshot' });
    }
});

/**
 * GET /api/inventory/history — recent uploads, for the audit trail in the UI.
 */
router.get('/history', requireViewer, async (_req, res) => {
    try {
        const rows = await db.all(
            `SELECT id, uploaded_by_email, file_name, row_count, created_at
             FROM inventory_snapshots
             ORDER BY created_at DESC
             LIMIT 10`
        );
        return res.json({ history: rows });
    } catch (err) {
        console.error('[inventory/history]', err.message);
        return res.status(500).json({ error: 'Could not load upload history' });
    }
});

/**
 * POST /api/inventory/upload — parse a workbook and store it as the new snapshot.
 */
router.post('/upload', userMutationLimiter, (req, res, next) => {
    if (!canUploadInventory(req.user)) {
        return res
            .status(403)
            .json({ error: 'You do not have permission to upload inventory sheets.' });
    }
    return upload.single('file')(req, res, (err) => {
        if (err) {
            const tooBig = err.code === 'LIMIT_FILE_SIZE';
            return res.status(400).json({
                error: tooBig
                    ? `File is too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`
                    : err.message || 'Upload failed',
            });
        }
        return next();
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file was uploaded' });
    }

    let parsed;
    try {
        parsed = parseInventoryWorkbook(req.file.buffer);
    } catch (err) {
        // A malformed sheet is the uploader's problem to fix, not a server fault.
        return res.status(422).json({ error: err.message });
    }

    const summary = summarizeInventory(parsed.records);
    const id = uuid();
    const createdAt = now();

    try {
        await db.run(
            `INSERT INTO inventory_snapshots
                (id, uploaded_by, uploaded_by_email, file_name, sheet_name, row_count, summary, payload, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                req.user.id,
                normalizeEmail(req.user.email),
                String(req.file.originalname || '').slice(0, 255),
                parsed.sheetName,
                parsed.records.length,
                JSON.stringify(summary),
                JSON.stringify(parsed.records),
                createdAt,
            ]
        );
    } catch (err) {
        console.error('[inventory/upload]', err.message);
        return res.status(500).json({ error: 'Could not save the uploaded sheet' });
    }

    console.warn(
        `[inventory] snapshot ${id} uploaded by ${req.user.email} — ${parsed.records.length} rows from ${req.file.originalname}`
    );

    await createNotification({
        type: 'upload',
        title: 'Daily Inventory Uploaded',
        message: `${req.user.name || req.user.email} uploaded inventory snapshot '${req.file.originalname}' (${parsed.records.length} rows)`,
        actorEmail: req.user.email,
        actorName: req.user.name || '',
        metadata: { fileName: req.file.originalname, rowCount: parsed.records.length, sheetName: parsed.sheetName },
    });

    return res.status(201).json({
        snapshot: {
            id,
            uploadedByEmail: normalizeEmail(req.user.email),
            fileName: req.file.originalname,
            sheetName: parsed.sheetName,
            rowCount: parsed.records.length,
            summary,
            records: parsed.records,
            createdAt,
        },
    });
});

export default router;
