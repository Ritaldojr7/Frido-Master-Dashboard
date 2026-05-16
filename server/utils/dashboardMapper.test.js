import { describe, it, expect } from 'vitest';
import { dashboardsFromJoinedRows } from './dashboardMapper.js';

describe('dashboardsFromJoinedRows', () => {
    it('builds nested title, backRoute, and sections ordered by section sort_order', () => {
        const rows = [
            {
                slug: 'alpha',
                def_title: 'Alpha Hub',
                back_route: '',
                def_updated_at: '2026-05-01T00:00:00.000Z',
                section_row_id: 's2',
                stable_id: 'sec-b',
                section_sort_order: 1,
                section_title: 'Second',
                section_icon: 'document',
                accent_color: 'blue',
                link_payload: JSON.stringify({
                    title: 'Link Two',
                    url: 'https://example.com/two',
                }),
                link_sort_order: 0,
            },
            {
                slug: 'alpha',
                def_title: 'Alpha Hub',
                back_route: '/home',
                def_updated_at: '2026-05-01T00:00:00.000Z',
                section_row_id: 's1',
                stable_id: 'sec-a',
                section_sort_order: 0,
                section_title: 'First',
                section_icon: 'chat',
                accent_color: 'emerald',
                link_payload: JSON.stringify({
                    title: 'Link One',
                    url: 'https://example.com/one',
                }),
                link_sort_order: 0,
            },
        ];

        const out = dashboardsFromJoinedRows(rows);
        expect(Object.keys(out)).toEqual(['alpha']);
        const d = out.alpha;
        expect(d.title).toBe('Alpha Hub');
        expect(d.backRoute).toBe('/home');
        expect(d.sections.map((x) => x.id)).toEqual(['sec-a', 'sec-b']);
        expect(d.sections[0].links).toHaveLength(1);
        expect(d.sections[0].links[0]).toMatchObject({ title: 'Link One', url: 'https://example.com/one' });
    });

    it('parses payloads in stable link order across multiple rows per section', () => {
        const rows = [
            {
                slug: 'x',
                def_title: 'X',
                back_route: '',
                def_updated_at: null,
                section_row_id: 's1',
                stable_id: 's1-stable',
                section_sort_order: 0,
                section_title: 'S',
                section_icon: 'i',
                accent_color: 'blue',
                link_payload: JSON.stringify({ title: 'A', variant: 'dark' }),
                link_sort_order: 0,
            },
            {
                slug: 'x',
                def_title: 'X',
                back_route: '',
                section_row_id: 's1',
                stable_id: 's1-stable',
                section_sort_order: 0,
                section_title: 'S',
                section_icon: 'i',
                accent_color: 'blue',
                link_payload: JSON.stringify({ title: 'B', variant: 'dark' }),
                link_sort_order: 1,
            },
        ];
        const d = dashboardsFromJoinedRows(rows).x;
        expect(d.sections[0].links.map((l) => l.title)).toEqual(['A', 'B']);
    });

    it('includes sections with zero links via one join row without payload', () => {
        const rows = [
            {
                slug: 'z',
                def_title: 'Z',
                back_route: '',
                def_updated_at: null,
                section_row_id: 'empty-sec',
                stable_id: 'empty',
                section_sort_order: 0,
                section_title: 'Empty',
                section_icon: 'document',
                accent_color: 'blue',
                link_payload: null,
                link_sort_order: null,
            },
        ];
        const d = dashboardsFromJoinedRows(rows).z;
        expect(d.sections).toHaveLength(1);
        expect(d.sections[0].links).toEqual([]);
    });

    it('skips malformed link JSON', () => {
        const rows = [
            {
                slug: 'bad',
                def_title: 'Bad',
                back_route: '',
                def_updated_at: null,
                section_row_id: 's1',
                stable_id: 's1',
                section_sort_order: 0,
                section_title: 'S',
                section_icon: '',
                accent_color: 'blue',
                link_payload: 'not-json{',
                link_sort_order: 0,
            },
        ];
        const d = dashboardsFromJoinedRows(rows).bad;
        expect(d.sections[0].links).toEqual([]);
    });
});
