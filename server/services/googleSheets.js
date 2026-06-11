/**
 * Google Sheets API — requires service account credentials in env.
 *
 *   GOOGLE_SERVICE_ACCOUNT_JSON — full JSON key (string)
 *   ORDER_DISPUTE_SPREADSHEET_ID — optional override
 */
import { google } from 'googleapis';
import { ORDER_DISPUTE_SHEET_GIDS, ORDER_DISPUTE_SPREADSHEET_ID } from '../constants/orderDisputeSheet.js';

let sheetsClient = null;
let cachedMeta = null;
let cachedMetaAt = 0;
const META_TTL_MS = 5 * 60 * 1000;

function credentialsConfigured() {
    return Boolean(String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim());
}

function getAuth() {
    const raw = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim();
    if (!raw) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
    }
    let credentials;
    try {
        credentials = JSON.parse(raw);
    } catch {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON');
    }
    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
}

function getSheetsApi() {
    if (!sheetsClient) {
        sheetsClient = google.sheets({ version: 'v4', auth: getAuth() });
    }
    return sheetsClient;
}

async function getSpreadsheetMeta(spreadsheetId) {
    const now = Date.now();
    if (cachedMeta && now - cachedMetaAt < META_TTL_MS) {
        return cachedMeta;
    }
    const api = getSheetsApi();
    const { data } = await api.spreadsheets.get({ spreadsheetId });
    cachedMeta = data;
    cachedMetaAt = now;
    return data;
}

function rowsToObjects(headerRow, dataRows) {
    const headers = (headerRow ?? []).map((h) => String(h ?? '').trim());
    return (dataRows ?? [])
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row) => {
            const obj = {};
            headers.forEach((header, i) => {
                if (!header) return;
                obj[header] = row[i] != null ? String(row[i]) : '';
            });
            return obj;
        });
}

/**
 * @param {string} spreadsheetId
 * @param {number[]} gids
 */
export async function fetchSheetsByGids(spreadsheetId, gids) {
    const meta = await getSpreadsheetMeta(spreadsheetId);
    const sheets = meta.sheets ?? [];
    const tabs = [];

    for (const gid of gids) {
        const sheet = sheets.find((s) => s.properties?.sheetId === gid);
        if (!sheet?.properties?.title) {
            tabs.push({
                gid,
                title: `Sheet ${gid}`,
                error: 'Tab not found in spreadsheet',
                headers: [],
                rows: [],
            });
            continue;
        }
        const title = sheet.properties.title;
        const range = `'${title.replace(/'/g, "''")}'`;
        const api = getSheetsApi();
        const { data } = await api.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        const values = data.values ?? [];
        const [headerRow, ...dataRows] = values.length > 0 ? values : [[], []];
        tabs.push({
            gid,
            title,
            headers: (headerRow ?? []).map((h) => String(h ?? '').trim()).filter(Boolean),
            rows: rowsToObjects(headerRow, dataRows),
        });
    }

    return tabs;
}

export async function fetchOrderDisputeSheets() {
    if (!credentialsConfigured()) {
        const err = new Error('Google Sheets credentials are not configured');
        err.code = 'SHEETS_NOT_CONFIGURED';
        throw err;
    }
    if (!ORDER_DISPUTE_SPREADSHEET_ID) {
        throw new Error('ORDER_DISPUTE_SPREADSHEET_ID is not set');
    }
    if (ORDER_DISPUTE_SHEET_GIDS.length === 0) {
        throw new Error('No order dispute sheet gids configured');
    }
    const tabs = await fetchSheetsByGids(ORDER_DISPUTE_SPREADSHEET_ID, ORDER_DISPUTE_SHEET_GIDS);
    return {
        spreadsheetId: ORDER_DISPUTE_SPREADSHEET_ID,
        fetchedAt: new Date().toISOString(),
        tabs,
    };
}

export function googleSheetsConfigured() {
    return credentialsConfigured();
}
