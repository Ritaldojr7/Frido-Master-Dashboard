import { feedbackData } from '../../src/config/feedbackDatabase.js';

/**
 * Build the feedback catalog for API responses.
 * Bundled config is authoritative for known product ids; DB rows fill gaps only
 * when an id exists in Postgres but not in the repo snapshot (legacy / manual rows).
 *
 * @param {Array<Record<string, unknown>>} dbProducts
 * @returns {Array<Record<string, unknown>>}
 */
export function buildFeedbackCatalog(dbProducts = []) {
    const dbById = new Map();
    for (const row of dbProducts) {
        const id = Number(row?.id);
        if (Number.isFinite(id)) dbById.set(id, row);
    }

    const configIds = new Set();
    const merged = [];

    for (const row of feedbackData) {
        const id = Number(row.id);
        if (!Number.isFinite(id)) continue;
        configIds.add(id);
        merged.push({ ...row, id });
    }

    for (const [id, row] of dbById) {
        if (!configIds.has(id)) {
            merged.push({ ...row, id });
        }
    }

    return merged;
}
