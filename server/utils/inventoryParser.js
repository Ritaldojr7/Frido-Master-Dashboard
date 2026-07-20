/**
 * Daily inventory sheet parser.
 *
 * Runs on the server so the stored snapshot is authoritative — clients upload the raw
 * workbook rather than pre-parsed JSON, which keeps a browser-side parsing bug (or a
 * hand-crafted payload) from corrupting data every executive then reads.
 *
 * The export uses a two-row header: row 1 carries section names, some of which span
 * several columns (e.g. "Total Net Inventory" over one column per facility), and row 2
 * carries the facility names underneath.
 */
import * as XLSX from 'xlsx';

/** Rows beyond this are rejected rather than silently truncated. */
export const MAX_INVENTORY_ROWS = 50_000;

export const STOCK_STATUSES = ['Reorder', 'Zero Sale', 'Sufficient'];

function toNumber(value) {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
}

/**
 * Forward-fill row 1 across the columns a merged section header spans, then attach the
 * row 2 facility name where present.
 */
function buildColumns(row1 = [], row2 = []) {
    const len = Math.max(row1.length, row2.length);
    const cols = [];
    let currentSection = null;

    for (let c = 0; c < len; c += 1) {
        const v1 = row1[c];
        if (v1 !== null && v1 !== undefined && String(v1).trim() !== '') {
            currentSection = String(v1).trim();
        }
        cols[c] = { section: currentSection, facility: null };
    }

    for (let c = 0; c < len; c += 1) {
        const v2 = row2[c];
        if (v2 !== null && v2 !== undefined && String(v2).trim() !== '') {
            cols[c].facility = String(v2).trim();
        }
    }

    return cols;
}

function findCol(cols, re) {
    for (let c = 0; c < cols.length; c += 1) {
        if (cols[c]?.section && re.test(cols[c].section)) return c;
    }
    return -1;
}

/**
 * @param {Buffer|Uint8Array} buffer raw .xlsx/.xls/.csv bytes
 * @returns {{ records: object[], sheetName: string }}
 * @throws {Error} when no sheet carries a recognisable "Product ID" header
 */
export function parseInventoryWorkbook(buffer) {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });

    const preferred = wb.SheetNames.find((n) => n.toLowerCase() === 'inventory');
    const candidates = preferred ? [preferred, ...wb.SheetNames.filter((n) => n !== preferred)] : wb.SheetNames;

    for (const name of candidates) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], {
            header: 1,
            defval: null,
            raw: true,
        });

        const headerRowIdx = rows.findIndex((r) =>
            Array.isArray(r) && r.some((c) => typeof c === 'string' && /product\s*id/i.test(c))
        );
        if (headerRowIdx === -1) continue;

        const row1 = rows[headerRowIdx] || [];
        const row2 = rows[headerRowIdx + 1] || [];
        const hasSubHeader = row2.some((c) => typeof c === 'string' && c.trim() !== '');
        const dataStart = hasSubHeader ? headerRowIdx + 2 : headerRowIdx + 1;
        const cols = buildColumns(row1, hasSubHeader ? row2 : []);

        const idx = {
            id: findCol(cols, /product\s*id/i),
            name: findCol(cols, /product\s*name/i),
            category: findCol(cols, /^category/i),
            type: findCol(cols, /product\s*type/i),
            totalNet: findCol(cols, /total\s*net\s*invt/i),
            totalBlocked: findCol(cols, /total\s*blocked\s*invt/i),
            totalInv: findCol(cols, /total\s*inventory/i),
            avgSale: findCol(cols, /avg\s*daily\s*sale/i),
            daysInvt: findCol(cols, /days\s*of\s*invt/i),
            status: findCol(cols, /stock\s*status/i),
        };
        if (idx.id === -1) continue;

        const netFacilityCols = cols
            .map((c, i) => ({ c, i }))
            .filter((o) => o.c?.section && /^total\s*net\s*inventory/i.test(o.c.section) && o.c.facility);
        const blockedFacilityCols = cols
            .map((c, i) => ({ c, i }))
            .filter((o) => o.c?.section && /raw\s*blocked\s*inventory/i.test(o.c.section) && o.c.facility);

        const records = [];
        for (let r = dataStart; r < rows.length; r += 1) {
            const row = rows[r];
            if (!row) continue;

            const pid = row[idx.id];
            if (pid === null || pid === undefined || String(pid).trim() === '') continue;

            if (records.length >= MAX_INVENTORY_ROWS) {
                throw new Error(
                    `Sheet exceeds the ${MAX_INVENTORY_ROWS.toLocaleString()} row limit.`
                );
            }

            const netByFacility = {};
            netFacilityCols.forEach((o) => {
                netByFacility[o.c.facility] = toNumber(row[o.i]);
            });
            const blockedByFacility = {};
            blockedFacilityCols.forEach((o) => {
                blockedByFacility[o.c.facility] = toNumber(row[o.i]);
            });

            const sumValues = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

            records.push({
                id: String(pid).trim(),
                name: idx.name !== -1 ? String(row[idx.name] ?? '') : '',
                category: idx.category !== -1 ? String(row[idx.category] || 'Uncategorized') : 'Uncategorized',
                type: idx.type !== -1 ? String(row[idx.type] || '') : '',
                netByFacility,
                blockedByFacility,
                totalNet: idx.totalNet !== -1 ? toNumber(row[idx.totalNet]) : sumValues(netByFacility),
                totalBlocked:
                    idx.totalBlocked !== -1 ? toNumber(row[idx.totalBlocked]) : sumValues(blockedByFacility),
                totalInv: idx.totalInv !== -1 ? toNumber(row[idx.totalInv]) : 0,
                avgSale: idx.avgSale !== -1 ? toNumber(row[idx.avgSale]) : 0,
                daysInvt: idx.daysInvt !== -1 && row[idx.daysInvt] != null ? toNumber(row[idx.daysInvt]) : null,
                status: idx.status !== -1 ? String(row[idx.status] || 'Unknown') : 'Unknown',
            });
        }

        if (records.length) return { records, sheetName: name };
    }

    throw new Error(
        'Could not find inventory data. The sheet needs a header row containing "Product ID".'
    );
}

/** Pre-computed totals so viewers do not recompute them on every page load. */
export function summarizeInventory(records) {
    const byStatus = {};
    let totalNet = 0;
    let totalBlocked = 0;

    for (const r of records) {
        totalNet += r.totalNet || 0;
        totalBlocked += r.totalBlocked || 0;
        const key = r.status || 'Unknown';
        byStatus[key] = (byStatus[key] || 0) + 1;
    }

    return {
        totalSkus: records.length,
        totalNet,
        totalBlocked,
        reorder: byStatus.Reorder || 0,
        zeroSale: byStatus['Zero Sale'] || 0,
        sufficient: byStatus.Sufficient || 0,
    };
}
