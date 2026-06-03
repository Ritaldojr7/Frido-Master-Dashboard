/**
 * Seed Supabase Postgres tables from bundled config using the service role key.
 * Use when DATABASE_URL is not set locally but SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are.
 *
 *   npm run seed:supabase-all
 *   npm run seed:supabase-all -- --force
 *   npm run seed:supabase-all -- --skip-pdfs
 */
import 'dotenv/config';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';

import { PHASE_ONE_DASHBOARD_SLUGS } from '../constants/dashboardSlugs.js';
import { isdNmData, staffExperienceStoreData } from '../../src/config/dashboardData.js';
import { feedbackData } from '../../src/config/feedbackDatabase.js';
import { uploadHrPolicyDocument, storageBackendLabel } from '../services/hrPolicyDocuments.js';
import { HR_POLICY_DOCUMENTS } from '../constants/hrPolicyDocuments.js';
import fs from 'fs';
import path from 'path';

const DEFAULT_LEAVE = '/Users/mbk-0107/Downloads/POLICY - LEAVE AND HOLIDAY 2026.pdf';
const DEFAULT_MARRIAGE = '/Users/mbk-0107/Downloads/Arcatron Mobility_Marriage Gifting Policy.pdf';

function getSupabase() {
    const url = String(process.env.SUPABASE_URL ?? '').trim();
    const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
    if (!url || !key) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    }
    return createClient(url, key);
}

function pickStaticSnapshots() {
    return [
        ['isd_nm', isdNmData],
        ['staff_experience_store', staffExperienceStoreData],
    ];
}

async function countTable(supabase, table) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
}

async function seedDashboard(supabase, slug, data, force) {
    const { data: existing, error: fetchErr } = await supabase
        .from('dashboard_defs')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
    if (fetchErr) throw new Error(`dashboard_defs lookup: ${fetchErr.message}`);

    if (existing && !force) {
        console.log(`Skipping dashboard "${slug}" — already seeded (pass --force to replace)`);
        return;
    }
    if (existing && force) {
        const { error: delErr } = await supabase.from('dashboard_defs').delete().eq('slug', slug);
        if (delErr) throw new Error(`dashboard_defs delete: ${delErr.message}`);
        console.log(`Removed existing dashboard slug="${slug}" before re-seed`);
    }

    const iso = new Date().toISOString();
    const defId = uuid();
    const { error: defErr } = await supabase.from('dashboard_defs').insert({
        id: defId,
        slug,
        title: data.title,
        back_route: data.backRoute != null ? data.backRoute : '',
        metadata: {},
        created_at: iso,
        updated_at: iso,
    });
    if (defErr) throw new Error(`dashboard_defs insert: ${defErr.message}`);

    let sectionOrder = 0;
    for (const sec of data.sections || []) {
        const sectionId = uuid();
        const { error: secErr } = await supabase.from('dashboard_sections').insert({
            id: sectionId,
            dashboard_id: defId,
            stable_id: sec.id,
            sort_order: sectionOrder++,
            title: sec.title,
            icon: sec.icon ?? '',
            accent_color: sec.accentColor ?? 'blue',
        });
        if (secErr) throw new Error(`dashboard_sections insert: ${secErr.message}`);

        let linkOrder = 0;
        for (const link of sec.links || []) {
            const payload = typeof link === 'object' && link !== null ? link : {};
            const { error: linkErr } = await supabase.from('dashboard_links').insert({
                id: uuid(),
                section_id: sectionId,
                sort_order: linkOrder++,
                payload,
            });
            if (linkErr) throw new Error(`dashboard_links insert: ${linkErr.message}`);
        }
    }

    console.log(`✓ Seeded dashboard_defs slug="${slug}" with ${sectionOrder} sections`);
}

async function seedFeedbackProducts(supabase, force) {
    const n = await countTable(supabase, 'feedback_products');
    if (n > 0 && !force) {
        console.log(`Skipping feedback_products — ${n} row(s) exist (pass --force to replace)`);
        return;
    }
    if (n > 0 && force) {
        const { error } = await supabase.from('feedback_products').delete().neq('stable_id', -1);
        if (error) throw new Error(`feedback_products delete: ${error.message}`);
        console.log('Cleared feedback_products (--force)');
    }

    const iso = new Date().toISOString();
    let sortOrder = 0;
    for (const row of feedbackData) {
        const stableId = Number(row.id);
        if (!Number.isFinite(stableId)) continue;
        const { error } = await supabase.from('feedback_products').insert({
            stable_id: stableId,
            sort_order: sortOrder++,
            payload: { ...row, id: stableId },
            updated_at: iso,
        });
        if (error) throw new Error(`feedback_products insert id=${stableId}: ${error.message}`);
    }
    console.log(`✓ Seeded feedback_products: ${sortOrder} products`);
}

async function uploadHrPdfs() {
    const leavePath = process.argv.includes('--leave')
        ? process.argv[process.argv.indexOf('--leave') + 1]
        : DEFAULT_LEAVE;
    const marriagePath = process.argv.includes('--marriage')
        ? process.argv[process.argv.indexOf('--marriage') + 1]
        : DEFAULT_MARRIAGE;

    console.log(`[hr-policy-pdfs] Backend: ${storageBackendLabel()}`);

    for (const [slug, filePath] of [
        ['leave-and-holiday-2026', leavePath],
        ['marriage-gifting-policy', marriagePath],
    ]) {
        const meta = HR_POLICY_DOCUMENTS[slug];
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
            throw new Error(`HR policy file not found: ${resolved}`);
        }
        const buffer = fs.readFileSync(resolved);
        await uploadHrPolicyDocument(meta.storagePath, buffer, meta.mimeType);
        console.log(`✓ ${slug} → ${meta.storagePath} (${buffer.length} bytes)`);
    }
}

async function main() {
    const force = process.argv.includes('--force');
    const skipPdfs = process.argv.includes('--skip-pdfs');

    const supabase = getSupabase();

    console.log('[seed-supabase-all] Starting…');
    console.log('  Slugs:', PHASE_ONE_DASHBOARD_SLUGS.join(', '));

    const snapshots = pickStaticSnapshots();
    for (const [slug, data] of snapshots) {
        if (!data) {
            console.error(`Missing snapshot for slug ${slug}`);
            process.exitCode = 1;
            continue;
        }
        await seedDashboard(supabase, slug, data, force);
    }

    await seedFeedbackProducts(supabase, force);

    if (!skipPdfs) {
        await uploadHrPdfs();
    } else {
        console.log('Skipped HR policy PDF upload (--skip-pdfs)');
    }

    const tables = [
        'dashboard_defs',
        'dashboard_sections',
        'dashboard_links',
        'feedback_products',
        'users',
        'notices',
        'invite_tokens',
        'notice_attachments',
        'notice_receipts',
    ];
    console.log('\n[seed-supabase-all] Row counts:');
    for (const t of tables) {
        try {
            const n = await countTable(supabase, t);
            console.log(`  ${t}: ${n}`);
        } catch (err) {
            console.log(`  ${t}: (error) ${err.message}`);
        }
    }

    console.log('\n[seed-supabase-all] Done.');
    console.log('Note: notices / invite_tokens / notice_attachments are created at runtime (not seeded from config).');
}

main().catch((err) => {
    console.error('[seed-supabase-all]', err.message || err);
    process.exit(1);
});
