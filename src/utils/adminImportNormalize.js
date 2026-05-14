/**
 * Normalisation for CSV/XLSX import keys and CSV delimiter detection (browser + Node).
 */

/** Canonical field key lists — used after normalizeImportRecordKeys maps headers to snake_case. */
export const IMPORT_FIELD_KEYS = {
    email: [
        'email',
        'e_mail',
        'email_address',
        'emailaddress',
        'work_email',
        'employee_email',
        'official_email',
        'mail',
    ],
    name: ['name', 'full_name', 'employee_name', 'display_name'],
    role: ['role', 'access_role', 'user_role', 'dashboard_role'],
    department: ['department', 'dept', 'team', 'division'],
    store_name: ['store_name', 'store', 'location', 'outlet', 'branch'],
};

export function pickImportField(record, keys) {
    for (const k of keys) {
        const v = record[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
            return v;
        }
    }
    return '';
}

/** Strip UTF-8 BOM so the first column is not keyed as "\\uFEFFemail". */
export function stripLeadingBom(text) {
    return String(text ?? '').replace(/^\uFEFF/, '');
}

/**
 * Pick delimiter from first non-empty line — Excel (EU locales) often uses `;`; TSV uses tab.
 */
export function detectCsvDelimiter(text) {
    const t = stripLeadingBom(text);
    const line = t.split(/\r?\n/).find((l) => l.trim()) || '';
    const comma = (line.match(/,/g) || []).length;
    const semi = (line.match(/;/g) || []).length;
    const tab = (line.match(/\t/g) || []).length;
    if (semi > comma && semi >= tab && semi > 0) return ';';
    if (tab > comma && tab > semi && tab > 0) return '\t';
    return ',';
}

/**
 * Normalise header / object key for matching (BOM, case, spaces, punctuation).
 */
export function normalizeImportHeaderKey(header) {
    return String(header ?? '')
        .replace(/^\uFEFF/g, '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

/**
 * Clone a parsed row so every column is keyed by normalised snake_case alias.
 */
export function normalizeImportRecordKeys(record) {
    const out = {};
    if (!record || typeof record !== 'object') return out;

    for (const [k, v] of Object.entries(record)) {
        const nk = normalizeImportHeaderKey(k);
        if (!nk) continue;
        const empty = v == null || String(v).trim() === '';
        if (out[nk] === undefined || (String(out[nk]).trim() === '' && !empty)) {
            out[nk] = v;
        }
    }
    return out;
}

/**
 * After Papa.parse(header:true), each row gets normalised headers (same helper as Excel).
 */
export function normalizeImportedRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => normalizeImportRecordKeys(row));
}
