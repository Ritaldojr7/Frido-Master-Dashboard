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
import zlib from 'node:zlib';
import * as XLSX from 'xlsx';

/** Rows beyond this are rejected rather than silently truncated. */
export const MAX_INVENTORY_ROWS = 50_000;

export const STOCK_STATUSES = ['Reorder', 'Zero Sale', 'Sufficient'];

function toNumber(value) {
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
}

function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i += 1) {
        let byte = buf[i];
        for (let j = 0; j < 8; j += 1) {
            const bit = (byte ^ crc) & 1;
            crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
            byte >>>= 1;
        }
    }
    return (crc ^ -1) >>> 0;
}

/**
 * Some export tools (e.g. Google Sheets exports / third-party tools) produce .xlsx files
 * where a cell references a shared string index beyond xl/sharedStrings.xml bounds.
 * SheetJS throws a TypeError internally when looking up out-of-bounds string indices,
 * silently setting wb.Sheets[name] = undefined.
 *
 * This sanitizer pre-scans .xlsx buffers for out-of-bounds shared string references and
 * pads xl/sharedStrings.xml with empty <si> elements so SheetJS never throws.
 */
export function sanitizeXlsxBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) return buffer;
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    // ZIP magic header check (0x04034b50)
    if (buf.length < 30 || buf.readUInt32LE(0) !== 0x04034b50) {
        return buffer;
    }

    try {
        const files = {};
        let pos = 0;
        let foundSharedStrings = false;

        while (pos < buf.length - 4) {
            const sig = buf.readUInt32LE(pos);
            if (sig === 0x04034b50) {
                const compMethod = buf.readUInt16LE(pos + 8);
                const compSize = buf.readUInt32LE(pos + 18);
                const fileNameLen = buf.readUInt16LE(pos + 26);
                const extraLen = buf.readUInt16LE(pos + 28);
                const fileName = buf.toString('utf8', pos + 30, pos + 30 + fileNameLen);
                const dataStart = pos + 30 + fileNameLen + extraLen;
                if (dataStart + compSize > buf.length) break;

                const compData = buf.slice(dataStart, dataStart + compSize);
                files[fileName] = compMethod === 8 ? zlib.inflateRawSync(compData) : compData;
                if (fileName === 'xl/sharedStrings.xml') foundSharedStrings = true;
                pos = dataStart + compSize;
            } else {
                pos += 1;
            }
        }

        if (!foundSharedStrings || !files['xl/sharedStrings.xml']) {
            return buffer;
        }

        let ssStr = files['xl/sharedStrings.xml'].toString('utf8');
        const countMatches = ssStr.match(/<si>/g) || [];
        const count = countMatches.length;

        let maxRef = -1;
        for (const [fn, content] of Object.entries(files)) {
            if (fn.startsWith('xl/worksheets/sheet') && fn.endsWith('.xml')) {
                const xml = content.toString('utf8');
                const re = /<c[^>]*\bt="s"[^>]*>\s*<v>(\d+)<\/v>/g;
                let m;
                while ((m = re.exec(xml)) !== null) {
                    const idx = parseInt(m[1], 10);
                    if (idx > maxRef) maxRef = idx;
                }
            }
        }

        if (maxRef < count) {
            return buffer;
        }

        const pad = '<si><t></t></si>'.repeat(maxRef - count + 1);
        ssStr = ssStr.replace('</sst>', `${pad}</sst>`);
        files['xl/sharedStrings.xml'] = Buffer.from(ssStr, 'utf8');

        const localHeaders = [];
        const cdHeaders = [];
        let offset = 0;

        for (const [fileName, content] of Object.entries(files)) {
            const nameBuf = Buffer.from(fileName, 'utf8');
            const compData = zlib.deflateRawSync(content);
            const crc = crc32(content);
            const uncompSize = content.length;
            const compSize = compData.length;

            const lh = Buffer.alloc(30 + nameBuf.length);
            lh.writeUInt32LE(0x04034b50, 0);
            lh.writeUInt16LE(20, 4);
            lh.writeUInt16LE(0, 6);
            lh.writeUInt16LE(8, 8);
            lh.writeUInt16LE(0, 10);
            lh.writeUInt16LE(0, 12);
            lh.writeUInt32LE(crc, 14);
            lh.writeUInt32LE(compSize, 18);
            lh.writeUInt32LE(uncompSize, 22);
            lh.writeUInt16LE(nameBuf.length, 26);
            lh.writeUInt16LE(0, 28);
            nameBuf.copy(lh, 30);
            localHeaders.push(lh, compData);

            const cd = Buffer.alloc(46 + nameBuf.length);
            cd.writeUInt32LE(0x02014b50, 0);
            cd.writeUInt16LE(20, 4);
            cd.writeUInt16LE(20, 6);
            cd.writeUInt16LE(0, 8);
            cd.writeUInt16LE(8, 10);
            cd.writeUInt16LE(0, 12);
            cd.writeUInt16LE(0, 14);
            cd.writeUInt32LE(crc, 16);
            cd.writeUInt32LE(compSize, 20);
            cd.writeUInt32LE(uncompSize, 24);
            cd.writeUInt16LE(nameBuf.length, 28);
            cd.writeUInt16LE(0, 30);
            cd.writeUInt16LE(0, 32);
            cd.writeUInt16LE(0, 34);
            cd.writeUInt16LE(0, 36);
            cd.writeUInt32LE(0, 38);
            cd.writeUInt32LE(offset, 42);
            nameBuf.copy(cd, 46);
            cdHeaders.push(cd);
            offset += lh.length + compData.length;
        }

        const cdStart = offset;
        let cdSize = 0;
        for (const cd of cdHeaders) cdSize += cd.length;

        const eocd = Buffer.alloc(22);
        eocd.writeUInt32LE(0x06054b50, 0);
        eocd.writeUInt16LE(0, 4);
        eocd.writeUInt16LE(0, 6);
        eocd.writeUInt16LE(cdHeaders.length, 8);
        eocd.writeUInt16LE(cdHeaders.length, 10);
        eocd.writeUInt32LE(cdSize, 12);
        eocd.writeUInt32LE(cdStart, 16);
        eocd.writeUInt16LE(0, 20);

        return Buffer.concat([...localHeaders, ...cdHeaders, eocd]);
    } catch {
        return buffer;
    }
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
    const sanitized = sanitizeXlsxBuffer(buffer);
    const wb = XLSX.read(sanitized, { type: 'buffer', cellDates: false });

    const hiddenSheetNames = new Set(
        (wb.Workbook?.Sheets || [])
            .filter((s) => s.Hidden)
            .map((s) => s.name)
    );

    const visibleSheetNames = wb.SheetNames.filter((n) => !hiddenSheetNames.has(n));
    const allSheets = visibleSheetNames.length ? visibleSheetNames : wb.SheetNames;

    const preferred = allSheets.find((n) => n.toLowerCase() === 'inventory');
    const candidates = preferred ? [preferred, ...allSheets.filter((n) => n !== preferred)] : allSheets;

    for (const name of candidates) {
        if (!wb.Sheets[name]) continue;

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

