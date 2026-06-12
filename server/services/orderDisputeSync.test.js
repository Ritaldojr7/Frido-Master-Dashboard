import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
    mockDb: {
        run: vi.fn(),
        all: vi.fn(),
        get: vi.fn(),
    },
}));

vi.mock('../db.js', () => ({
    default: mockDb,
    now: () => '2026-06-11T12:00:00.000Z',
}));

vi.mock('./googleSheets.js', () => ({
    googleSheetsConfigured: vi.fn(() => true),
    fetchOrderDisputeSheets: vi.fn(),
}));

import { fetchOrderDisputeSheets, googleSheetsConfigured } from './googleSheets.js';
import {
    syncOrderDisputeFromSheets,
    loadOrderDisputeFromDb,
    getOrderDisputeSyncStatus,
    isSyncAuthorized,
} from './orderDisputeSync.js';

describe('syncOrderDisputeFromSheets', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        googleSheetsConfigured.mockReturnValue(true);
    });

    it('skips when Google credentials are not configured', async () => {
        googleSheetsConfigured.mockReturnValue(false);
        const result = await syncOrderDisputeFromSheets();
        expect(result).toEqual({ skipped: true, reason: 'not_configured' });
        expect(fetchOrderDisputeSheets).not.toHaveBeenCalled();
    });

    it('writes tab metadata and snapshots for each fetched tab', async () => {
        fetchOrderDisputeSheets.mockResolvedValue({
            spreadsheetId: 'sheet-id',
            tabs: [
                {
                    gid: 1178023285,
                    title: 'Tab One',
                    headers: ['Order', 'Status'],
                    rows: [{ Order: 'A1', Status: 'Open' }],
                },
                {
                    gid: 999,
                    title: 'Tab Two',
                    headers: ['SKU'],
                    rows: [{ SKU: 'X' }],
                },
            ],
        });

        const result = await syncOrderDisputeFromSheets();

        expect(result.ok).toBe(true);
        expect(result.tabsSynced).toBe(2);
        expect(mockDb.run).toHaveBeenCalled();
        expect(mockDb.run.mock.calls.some((call) => String(call[0]).includes('order_dispute_tabs'))).toBe(true);
        expect(mockDb.run.mock.calls.some((call) => String(call[0]).includes('order_dispute_tab_snapshots'))).toBe(
            true
        );
        expect(mockDb.run.mock.calls.some((call) => String(call[0]).includes('order_dispute_sync_runs'))).toBe(true);
    });
});

describe('loadOrderDisputeFromDb', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('parses JSON headers and rows from DB rows', async () => {
        mockDb.all.mockResolvedValue([
            {
                gid: 1178023285,
                title: 'Disputes',
                sort_order: 0,
                headers: '["Order","Status"]',
                rows: '[{"Order":"A1","Status":"Open"}]',
                synced_at: '2026-06-11T12:00:00.000Z',
            },
        ]);

        const payload = await loadOrderDisputeFromDb();
        expect(payload.tabs).toHaveLength(1);
        expect(payload.tabs[0].headers).toEqual(['Order', 'Status']);
        expect(payload.tabs[0].rows[0].Order).toBe('A1');
        expect(payload.syncedAt).toBe('2026-06-11T12:00:00.000Z');
    });
});

describe('getOrderDisputeSyncStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        googleSheetsConfigured.mockReturnValue(true);
    });

    it('returns configured flag and last sync error when present', async () => {
        mockDb.get
            .mockResolvedValueOnce({
                status: 'error',
                error_message: 'Sheet not found',
                finished_at: '2026-06-11T11:00:00.000Z',
                started_at: '2026-06-11T11:00:00.000Z',
                tabs_synced: 0,
            })
            .mockResolvedValueOnce({ synced_at: '2026-06-11T10:00:00.000Z' });

        const status = await getOrderDisputeSyncStatus();
        expect(status.configured).toBe(true);
        expect(status.syncError).toBe('Sheet not found');
        expect(status.lastSyncedAt).toBe('2026-06-11T10:00:00.000Z');
    });
});

describe('isSyncAuthorized', () => {
    it('allows admin users', () => {
        expect(isSyncAuthorized({ user: { role: 'admin', roles: ['admin'] } })).toBe(true);
    });

    it('denies non-admin without secret', () => {
        expect(isSyncAuthorized({ user: { role: 'staff', roles: ['staff'] } })).toBe(false);
    });
});
