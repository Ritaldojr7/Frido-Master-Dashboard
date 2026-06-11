import { describe, it, expect } from 'vitest';
import { buildFeedbackCatalog } from './feedbackCatalog.js';

describe('buildFeedbackCatalog', () => {
    it('returns bundled config products when DB is empty', () => {
        const catalog = buildFeedbackCatalog([]);
        expect(catalog.length).toBeGreaterThan(40);
        expect(catalog.some((p) => p.productName === "Frido Active Casual Sneakers - Men's")).toBe(true);
    });

    it('prefers bundled config over stale DB payloads for the same id', () => {
        const catalog = buildFeedbackCatalog([
            {
                id: 43,
                productName: 'Stale name from DB',
                category: 'Footwear',
            },
        ]);
        const sneakers = catalog.find((p) => p.id === 43);
        expect(sneakers?.productName).toBe("Frido Active Casual Sneakers - Men's");
    });

    it('appends DB-only rows not present in config', () => {
        const catalog = buildFeedbackCatalog([
            {
                id: 9999,
                productName: 'Legacy DB-only product',
                category: 'Combo',
                reportLink: 'https://example.com/report',
                releaseDate: '01/01/2026',
                dataType: 'Delivered Data',
            },
        ]);
        expect(catalog.some((p) => p.id === 9999)).toBe(true);
    });
});
