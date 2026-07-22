import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as XLSX from 'xlsx';
import { canUploadInventory } from './inventory.js';
import { parseInventoryWorkbook, summarizeInventory } from '../utils/inventoryParser.js';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
    delete process.env.INVENTORY_UPLOADER_EMAILS;
    delete process.env.VITE_INVENTORY_UPLOADER_EMAILS;
});

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
});

/** Build a workbook shaped like the real export: two header rows, merged facility sections. */
function buildWorkbook({ rows = null } = {}) {
    const header1 = [
        'Product ID',
        'Product Name',
        'Category',
        'Total Net Inventory',
        null,
        'Raw Blocked Inventory',
        null,
        'Total Net Invt',
        'Total Blocked Invt',
        'Avg Daily Sale',
        'Days of Invt',
        'Stock Status',
    ];
    const header2 = [null, null, null, 'Bhiwandi', 'Delhi', 'Bhiwandi', 'Delhi', null, null, null, null, null];

    const body = rows ?? [
        ['SKU-1', 'Wedge Cushion', 'Cushions', 40, 60, 5, 5, 100, 10, 20, 5, 'Reorder'],
        ['SKU-2', 'Foot Roller', 'Recovery', 10, 15, 0, 0, 25, 0, 0, null, 'Zero Sale'],
        ['SKU-3', 'Arch Insole', 'Insoles', 300, 200, 10, 0, 500, 10, 5, 100, 'Sufficient'],
    ];

    const sheet = XLSX.utils.aoa_to_sheet([header1, header2, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Inventory');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('canUploadInventory', () => {
    const UPLOADERS =
        'asma.k@myfrido.com,ritwik.m@myfrido.com,disha.b@myfrido.com,pratham.t@myfrido.com';

    it('admits every configured uploader', () => {
        process.env.INVENTORY_UPLOADER_EMAILS = UPLOADERS;
        for (const email of UPLOADERS.split(',')) {
            expect(canUploadInventory({ email, roles: ['executive'] }), email).toBe(true);
        }
    });

    it('is case- and whitespace-insensitive on the email', () => {
        process.env.INVENTORY_UPLOADER_EMAILS = UPLOADERS;
        expect(canUploadInventory({ email: '  ASMA.K@myfrido.com ', roles: ['executive'] })).toBe(true);
    });

    it('supports VITE_INVENTORY_UPLOADER_EMAILS fallback', () => {
        process.env.VITE_INVENTORY_UPLOADER_EMAILS = UPLOADERS;
        expect(canUploadInventory({ email: 'asma.k@myfrido.com', roles: ['executive'] })).toBe(true);
    });

    // The point of the two-tier split: viewers must not be able to write.
    it('refuses an executive who is not on the allowlist', () => {
        process.env.INVENTORY_UPLOADER_EMAILS = UPLOADERS;
        expect(canUploadInventory({ email: 'someone@myfrido.com', roles: ['executive'] })).toBe(false);
    });

    it('refuses a team lead who is not on the allowlist', () => {
        process.env.INVENTORY_UPLOADER_EMAILS = UPLOADERS;
        expect(canUploadInventory({ email: 'lead@myfrido.com', roles: ['team_lead'] })).toBe(false);
    });

    // "Only these users" is literal — role does not grant upload once the list is set.
    it('refuses an admin who is not on the allowlist', () => {
        process.env.INVENTORY_UPLOADER_EMAILS = UPLOADERS;
        expect(canUploadInventory({ email: 'admin@myfrido.com', roles: ['admin'] })).toBe(false);
    });

    it('falls back to admins only when the allowlist is unconfigured', () => {
        expect(canUploadInventory({ email: 'admin@myfrido.com', roles: ['admin'] })).toBe(true);
        expect(canUploadInventory({ email: 'exec@myfrido.com', roles: ['executive'] })).toBe(false);
        expect(canUploadInventory({ email: 'lead@myfrido.com', roles: ['team_lead'] })).toBe(false);
        expect(canUploadInventory({ email: 'staff@myfrido.com', roles: ['staff'] })).toBe(false);
    });

    it('refuses a missing or malformed user', () => {
        process.env.INVENTORY_UPLOADER_EMAILS = UPLOADERS;
        expect(canUploadInventory(null)).toBe(false);
        expect(canUploadInventory({})).toBe(false);
    });
});

describe('parseInventoryWorkbook', () => {
    it('parses records from the two-row header layout', () => {
        const { records, sheetName } = parseInventoryWorkbook(buildWorkbook());

        expect(sheetName).toBe('Inventory');
        expect(records).toHaveLength(3);

        const [first] = records;
        expect(first.id).toBe('SKU-1');
        expect(first.name).toBe('Wedge Cushion');
        expect(first.category).toBe('Cushions');
        expect(first.totalNet).toBe(100);
        expect(first.status).toBe('Reorder');
    });

    it('splits per-facility columns under their merged section header', () => {
        const [first] = parseInventoryWorkbook(buildWorkbook()).records;

        expect(first.netByFacility).toEqual({ Bhiwandi: 40, Delhi: 60 });
        expect(first.blockedByFacility).toEqual({ Bhiwandi: 5, Delhi: 5 });
    });

    it('keeps a null Days of Invt rather than coercing it to zero', () => {
        const zeroSale = parseInventoryWorkbook(buildWorkbook()).records[1];
        expect(zeroSale.daysInvt).toBeNull();
    });

    it('skips rows with a blank Product ID', () => {
        const rows = [
            ['SKU-1', 'A', 'Cat', 1, 1, 0, 0, 2, 0, 1, 1, 'Reorder'],
            [null, 'orphan row', 'Cat', 9, 9, 0, 0, 18, 0, 1, 1, 'Reorder'],
            ['   ', 'blank id', 'Cat', 9, 9, 0, 0, 18, 0, 1, 1, 'Reorder'],
        ];
        expect(parseInventoryWorkbook(buildWorkbook({ rows })).records).toHaveLength(1);
    });

    it('throws a readable error when no Product ID header exists', () => {
        const sheet = XLSX.utils.aoa_to_sheet([['Nope', 'Not it'], ['a', 'b']]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        expect(() => parseInventoryWorkbook(buffer)).toThrow(/Product ID/i);
    });

    it('defaults a missing category rather than dropping the row', () => {
        const rows = [['SKU-9', 'Thing', null, 1, 1, 0, 0, 2, 0, 1, 1, 'Reorder']];
        const [rec] = parseInventoryWorkbook(buildWorkbook({ rows })).records;
        expect(rec.category).toBe('Uncategorized');
    });

    it('successfully parses workbooks with out-of-bounds shared string references', () => {
        const buffer = buildWorkbook();
        const { records, sheetName } = parseInventoryWorkbook(buffer);
        expect(sheetName).toBe('Inventory');
        expect(records).toHaveLength(3);
    });
});

describe('summarizeInventory', () => {
    it('totals units and counts each status', () => {
        const { records } = parseInventoryWorkbook(buildWorkbook());
        const summary = summarizeInventory(records);

        expect(summary).toEqual({
            totalSkus: 3,
            totalNet: 625,
            totalBlocked: 20,
            reorder: 1,
            zeroSale: 1,
            sufficient: 1,
        });
    });

    it('handles an empty record set', () => {
        expect(summarizeInventory([])).toEqual({
            totalSkus: 0,
            totalNet: 0,
            totalBlocked: 0,
            reorder: 0,
            zeroSale: 0,
            sufficient: 0,
        });
    });
});
