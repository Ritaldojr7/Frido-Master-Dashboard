import { google } from 'googleapis';
import { parseGoogleServiceAccountJson } from '../utils/parseGoogleJson.js';

function credentialsConfigured() {
    return Boolean(String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim());
}

function getAuth() {
    const raw = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim();
    if (!raw) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
    }
    const credentials = parseGoogleServiceAccountJson(raw);
    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

let sheetsClient = null;
function getSheetsApi() {
    if (!sheetsClient) {
        sheetsClient = google.sheets({ version: 'v4', auth: getAuth() });
    }
    return sheetsClient;
}

/**
 * Fetch a specific tab from Google Sheets by title
 */
export async function fetchSheetTabByTitle(spreadsheetId, tabName) {
    if (!credentialsConfigured()) {
        const err = new Error('Google Sheets credentials are not configured');
        err.code = 'SHEETS_NOT_CONFIGURED';
        throw err;
    }

    const api = getSheetsApi();
    // Escape single quotes in sheet title
    const range = `'${tabName.replace(/'/g, "''")}'`;
    
    const response = await api.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    const values = response.data.values ?? [];
    if (values.length === 0) {
        return { headers: [], rows: [] };
    }

    const [headerRow, ...dataRows] = values;
    const headers = (headerRow ?? []).map((h) => String(h ?? '').trim()).filter(Boolean);

    const rows = (dataRows ?? [])
        .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
        .map((row) => {
            const obj = {};
            headerRow.forEach((header, i) => {
                const cleanHeader = String(header ?? '').trim();
                if (!cleanHeader) return;
                obj[cleanHeader] = row[i] != null ? String(row[i]) : '';
            });
            return obj;
        });

    return { headers, rows };
}

/**
 * Fetch all required manpower tabs: Roster, Morning, Evening, LOP
 */
export async function fetchAllManpowerSheets(spreadsheetId) {
    if (!spreadsheetId) {
        throw new Error('MANPOWER_SPREADSHEET_ID is not configured');
    }

    const tabsToFetch = ['Roster', 'Morning', 'Evening', 'LOP'];
    const results = {};
    const warnings = [];
    const rowCounts = {};

    for (const tab of tabsToFetch) {
        try {
            const { headers, rows } = await fetchSheetTabByTitle(spreadsheetId, tab);
            results[tab] = { headers, rows };
            rowCounts[tab] = rows.length;
        } catch (err) {
            console.error(`[manpowerSheets] Error fetching tab "${tab}":`, err.message);
            results[tab] = { headers: [], rows: [] };
            rowCounts[tab] = 0;
            warnings.push(`Tab "${tab}" fetch failed: ${err.message}`);
        }
    }

    return {
        data: results,
        rowCounts,
        warnings,
        fetchedAt: new Date().toISOString(),
    };
}

export function isManpowerConfigured() {
    return credentialsConfigured() && Boolean(process.env.MANPOWER_SPREADSHEET_ID);
}

/**
 * Append a new row to the LOP tab
 */
export async function appendLopRow(spreadsheetId, data) {
    if (!credentialsConfigured()) {
        throw new Error('Google Sheets credentials are not configured');
    }

    const api = getSheetsApi();
    const range = `'LOP'`;
    
    // Assuming columns: Timestamp, Email, Agent Name, Vertical Name, Date of LOP
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const row = [timestamp, data.email, data.agentName, data.verticalName, data.dateOfLop];

    await api.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [row],
        },
    });
}
