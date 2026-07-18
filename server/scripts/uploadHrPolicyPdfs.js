/**
 * Upload ISD NM HR policy PDFs to Supabase Storage (or local dev fallback).
 *
 *   npm run upload:hr-policy-pdfs
 *   npm run upload:hr-policy-pdfs -- --leave "/path/to/leave.pdf" --marriage "/path/to/marriage.pdf"
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { HR_POLICY_DOCUMENTS } from '../constants/hrPolicyDocuments.js';
import { uploadHrPolicyDocument, storageBackendLabel } from '../services/hrPolicyDocuments.js';

const DEFAULT_LEAVE = '/Users/mbk-0107/Downloads/POLICY - LEAVE AND HOLIDAY 2026.pdf';
const DEFAULT_MARRIAGE = '/Users/mbk-0107/Downloads/Arcatron Mobility_Marriage Gifting Policy.pdf';
const DEFAULT_SHOPIFY = '/Users/mbk-0107/Downloads/Frido_Shopify_Training_Manual_v1_updated (1).pdf';
const DEFAULT_SLACK = '/Users/mbk-0107/Downloads/Frido_Slack_Training_Manual_v1.pdf';

function readArg(flag, fallback) {
    const idx = process.argv.indexOf(flag);
    if (idx === -1 || !process.argv[idx + 1]) return fallback;
    return process.argv[idx + 1];
}

async function uploadOne(slug, filePath) {
    const meta = HR_POLICY_DOCUMENTS[slug];
    if (!meta) {
        throw new Error(`Unknown policy slug: ${slug}`);
    }
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`File not found: ${resolved}`);
    }
    const buffer = fs.readFileSync(resolved);
    await uploadHrPolicyDocument(meta.storagePath, buffer, meta.mimeType);
    console.log(`✓ ${slug} → ${meta.storagePath} (${buffer.length} bytes)`);
}

async function main() {
    const leavePath = readArg('--leave', DEFAULT_LEAVE);
    const marriagePath = readArg('--marriage', DEFAULT_MARRIAGE);
    const shopifyPath = readArg('--shopify', DEFAULT_SHOPIFY);
    const slackPath = readArg('--slack', DEFAULT_SLACK);

    console.log(`[upload-hr-policy-pdfs] Backend: ${storageBackendLabel()}`);

    await uploadOne('leave-and-holiday-2026', leavePath);
    await uploadOne('marriage-gifting-policy', marriagePath);
    await uploadOne('shopify-training-manual', shopifyPath);
    await uploadOne('slack-training-manual', slackPath);

    console.log('[upload-hr-policy-pdfs] Done.');
}

main().catch((err) => {
    console.error('[upload-hr-policy-pdfs]', err.message);
    process.exit(1);
});
