/**
 * Tests for CSV/XLSX import normalisation (delimiters, BOM, header keys).
 */
import { describe, it, expect } from 'vitest';
import Papa from 'papaparse';
import {
    IMPORT_FIELD_KEYS,
    detectCsvDelimiter,
    normalizeImportHeaderKey,
    normalizeImportedRows,
    pickImportField,
    stripLeadingBom,
} from './adminImportNormalize.js';
import { validateImportRow } from '../../server/utils/userImport.js';

describe('stripLeadingBom / delimiter / headers', () => {
    it('strips BOM from text start', () => {
        expect(stripLeadingBom('\uFEFFemail,name\na@myfrido.com,X')).toBe('email,name\na@myfrido.com,X');
    });

    it('detects semicolon when it dominates header line', () => {
        expect(detectCsvDelimiter('Email;Name;Role\n')).toBe(';');
        expect(detectCsvDelimiter('Email,Name,Name\n')).toBe(',');
        expect(detectCsvDelimiter('a\tb\tc\n')).toBe('\t');
    });

    it('normalizeImportHeaderKey handles BOM-ish label and punctuation', () => {
        expect(normalizeImportHeaderKey('\uFEFF Email (work) ')).toBe('email_work');
    });
});

describe('normalizeImportedRows + pickImportField', () => {
    it('parses semicolon CSV and surfaces email/name via IMPORT_FIELD_KEYS', () => {
        const text = 'Email ; Name ; Role\n  ada@myfrido.com ; Ada Lo ; team_lead ';
        const delim = detectCsvDelimiter(text);
        const parsed = Papa.parse(stripLeadingBom(text), {
            header: true,
            skipEmptyLines: 'greedy',
            delimiter: delim,
            transformHeader: (h) => normalizeImportHeaderKey(h),
        });
        const rows = normalizeImportedRows(parsed.data || []);
        expect(rows.length).toBeGreaterThan(0);
        const r = rows[0];
        expect(String(pickImportField(r, IMPORT_FIELD_KEYS.email))).toContain('ada@myfrido.com');
        expect(String(pickImportField(r, IMPORT_FIELD_KEYS.name))).toContain('Ada');
        expect(String(pickImportField(r, IMPORT_FIELD_KEYS.role))).toContain('team_lead');
    });
});

describe('validateImportRow integration', () => {
    it('accepts BOM-prefixed Excel-style header keys', () => {
        const raw = {
            [`\uFEFFemail`]: 'zoe@myfrido.com',
            Name: 'Zoe',
            ROLE: 'staff',
        };
        const v = validateImportRow(raw, 0);
        expect(v.ok).toBe(true);
        expect(v.email).toBe('zoe@myfrido.com');
    });
});
