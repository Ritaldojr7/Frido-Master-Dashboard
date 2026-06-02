/**
 * HR policy PDF storage — Supabase Storage when configured, else local disk for dev.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_HR_POLICY_BUCKET } from '../constants/hrPolicyDocuments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_ROOT = path.join(__dirname, '..', 'data', 'hr-policy-documents');

function supabaseConfigured() {
    return Boolean(
        String(process.env.SUPABASE_URL ?? '').trim() &&
            String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
    );
}

function getBucket() {
    return (
        String(process.env.SUPABASE_HR_POLICY_BUCKET ?? process.env.SUPABASE_NOTICE_BUCKET ?? DEFAULT_HR_POLICY_BUCKET).trim() ||
        DEFAULT_HR_POLICY_BUCKET
    );
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

/** @returns {Promise<Buffer>} */
export async function readHrPolicyBuffer(storagePath) {
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
        throw new Error('HR policy file not found');
    }
    return fs.readFileSync(dest);
}

/**
 * @param {string} storagePath
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
export async function uploadHrPolicyDocument(storagePath, buffer, mimeType = 'application/pdf') {
    if (supabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        const { error } = await supabase.storage.from(getBucket()).upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
        });
        if (error) {
            throw new Error(`Storage upload failed: ${error.message}`);
        }
        return;
    }
    const dest = localPathFor(storagePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buffer);
}

export function storageBackendLabel() {
    return supabaseConfigured() ? 'supabase' : 'local';
}
