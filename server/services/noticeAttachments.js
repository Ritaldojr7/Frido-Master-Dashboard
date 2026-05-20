/**
 * Notice attachment storage (PDF/PNG/JPEG) — Supabase Storage when configured, else local disk.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import {
    MAX_NOTICE_PDF_BYTES,
    MAX_NOTICE_PDF_COUNT,
    DEFAULT_NOTICE_BUCKET,
    extensionForNoticeMime,
    resolveNoticeAttachmentMime,
} from '../constants/noticeAttachments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_ROOT = path.join(__dirname, '..', 'data', 'notice-attachments');

function supabaseConfigured() {
    return Boolean(
        String(process.env.SUPABASE_URL ?? '').trim() &&
            String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
    );
}

function getBucket() {
    return String(process.env.SUPABASE_NOTICE_BUCKET ?? DEFAULT_NOTICE_BUCKET).trim() || DEFAULT_NOTICE_BUCKET;
}

function getSupabaseAdmin() {
    return createClient(
        String(process.env.SUPABASE_URL).trim(),
        String(process.env.SUPABASE_SERVICE_ROLE_KEY).trim()
    );
}

function localPathFor(storagePath) {
    return path.join(LOCAL_ROOT, storagePath.replace(/\//g, path.sep));
}

/**
 * @param {import('multer').File[]} files
 */
export function validateNoticePdfFiles(files) {
    if (!files?.length) return { ok: true, files: [] };
    if (files.length > MAX_NOTICE_PDF_COUNT) {
        return { ok: false, error: `At most ${MAX_NOTICE_PDF_COUNT} attachments allowed` };
    }
    for (const f of files) {
        if (!resolveNoticeAttachmentMime(f)) {
            return { ok: false, error: 'Only PDF, PNG, and JPEG files are allowed' };
        }
        if (f.size > MAX_NOTICE_PDF_BYTES) {
            return {
                ok: false,
                error: `Each file must be ${MAX_NOTICE_PDF_BYTES / (1024 * 1024)} MB or smaller`,
            };
        }
    }
    return { ok: true, files };
}

/**
 * @param {number} existingCount
 * @param {number} newCount
 * @param {number} keepCount
 */
export function validateAttachmentCount(existingCount, newCount, keepCount) {
    const total = keepCount + newCount;
    if (total > MAX_NOTICE_PDF_COUNT) {
        return {
            ok: false,
            error: `At most ${MAX_NOTICE_PDF_COUNT} attachments per notice (you have ${keepCount} kept + ${newCount} new)`,
        };
    }
    return { ok: true };
}

/**
 * @param {string} noticeId
 * @param {import('multer').File} file
 * @param {number} sortOrder
 */
export async function uploadNoticePdf(noticeId, file, sortOrder = 0) {
    const attachmentId = uuid();
    const mimeType = resolveNoticeAttachmentMime(file) || 'application/octet-stream';
    const ext = extensionForNoticeMime(mimeType);
    const storagePath = `notices/${noticeId}/${attachmentId}${ext}`;
    const buffer = file.buffer;

    if (supabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.storage.from(getBucket()).upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: false,
        });
        if (error) {
            throw new Error(`Storage upload failed: ${error.message}`);
        }
    } else {
        const dest = localPathFor(storagePath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, buffer);
    }

    return {
        id: attachmentId,
        notice_id: noticeId,
        file_name: file.originalname || `${attachmentId}${ext}`,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: file.size,
        sort_order: sortOrder,
    };
}

export async function deleteNoticePdf(storagePath) {
    if (supabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.storage.from(getBucket()).remove([storagePath]);
        if (error) {
            console.warn('[noticeAttachments] Supabase delete failed:', storagePath, error.message);
        }
        return;
    }
    const dest = localPathFor(storagePath);
    try {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
    } catch (err) {
        console.warn('[noticeAttachments] Local delete failed:', storagePath, err.message);
    }
}

/** @returns {Promise<Buffer>} */
export async function readNoticePdfBuffer(storagePath) {
    if (supabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.storage.from(getBucket()).download(storagePath);
        if (error) {
            throw new Error(`Storage download failed: ${error.message}`);
        }
        return Buffer.from(await data.arrayBuffer());
    }
    const dest = localPathFor(storagePath);
    if (!fs.existsSync(dest)) {
        throw new Error('Attachment file not found');
    }
    return fs.readFileSync(dest);
}

export function storageBackendLabel() {
    return supabaseConfigured() ? 'supabase' : 'local';
}

/**
 * Short-lived signed URL for email fallbacks (Supabase only).
 * @param {string} storagePath
 * @param {number} expiresInSeconds
 */
export async function createSignedDownloadUrl(storagePath, expiresInSeconds = 60 * 60 * 24 * 7) {
    if (!supabaseConfigured()) {
        return null;
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
        .from(getBucket())
        .createSignedUrl(storagePath, expiresInSeconds);
    if (error) {
        console.warn('[noticeAttachments] signed URL failed:', error.message);
        return null;
    }
    return data?.signedUrl || null;
}
