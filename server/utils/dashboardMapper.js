/**
 * Build `{ title, backRoute, sections, slug?, updatedAt? }` from flat JOIN rows
 * (see dashboards route SQL).
 */

function pickNonEmpty(existing, incoming) {
    const e = String(existing ?? '').trim();
    if (e) return e;
    return String(incoming ?? '').trim();
}

function coerceUpdatedAt(raw) {
    if (raw == null) return null;
    if (raw instanceof Date) return raw.toISOString();
    if (typeof raw === 'number') return new Date(raw).toISOString();
    return String(raw);
}

/** @param {{ slug: string, def_title: string, back_route?: string|null, def_updated_at?: unknown, stable_id?: string, section_sort_order?: number, section_title?: string, section_icon?: string, accent_color?: string, section_row_id?: string, link_payload?: string|null }} row */
export function dashboardsFromJoinedRows(rows) {
    /** @type {Map<string, { slug: string, title: string, backRoute: string, updatedAt: string|null, sectionsById: Map<string, { id: string, title: string, icon: string, accentColor: string, sortOrder: number, links: object[] }> }>} */
    const bySlug = new Map();

    for (const row of rows || []) {
        const slug = row.slug;
        if (!slug) continue;

        if (!bySlug.has(slug)) {
            const updatedAt =
                coerceUpdatedAt(row.def_updated_at ?? row.dashboard_updated_at) ?? null;
            bySlug.set(slug, {
                slug,
                title: row.def_title ?? row.title ?? '',
                backRoute: String(row.back_route ?? '').trim(),
                updatedAt,
                sectionsById: new Map(),
            });
        } else {
            const dash = bySlug.get(slug);
            dash.title = pickNonEmpty(dash.title, row.def_title ?? row.title);
            dash.backRoute = pickNonEmpty(dash.backRoute, row.back_route);
            const newer = coerceUpdatedAt(row.def_updated_at ?? row.dashboard_updated_at);
            if (newer != null && (dash.updatedAt == null || newer > dash.updatedAt)) {
                dash.updatedAt = newer;
            }
        }

        const dash = bySlug.get(slug);
        const sectionRowId = row.section_row_id;
        if (sectionRowId == null) continue;

        if (!dash.sectionsById.has(sectionRowId)) {
            dash.sectionsById.set(sectionRowId, {
                id: row.stable_id ?? sectionRowId,
                title: row.section_title ?? '',
                icon: row.section_icon ?? '',
                accentColor: row.accent_color ?? 'blue',
                sortOrder: Number(row.section_sort_order) || 0,
                links: [],
            });
        }

        const payloadRaw = row.link_payload;
        if (payloadRaw == null || payloadRaw === '') continue;

        const sec = dash.sectionsById.get(sectionRowId);
        let linkObj;
        try {
            linkObj = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : payloadRaw;
        } catch {
            continue;
        }
        if (!linkObj || typeof linkObj !== 'object') continue;
        sec.links.push(linkObj);
    }

    const out = {};
    for (const [slug, d] of bySlug) {
        const sections = Array.from(d.sectionsById.values()).sort((a, b) => {
            const so = a.sortOrder - b.sortOrder;
            if (so !== 0) return so;
            return a.title.localeCompare(b.title);
        });
        out[slug] = {
            slug: d.slug,
            title: d.title,
            backRoute: d.backRoute,
            ...(d.updatedAt != null ? { updatedAt: d.updatedAt } : {}),
            sections: sections.map(({ sortOrder: _sort, links, ...rest }) => ({
                ...rest,
                links,
            })),
        };
    }

    return out;
}
