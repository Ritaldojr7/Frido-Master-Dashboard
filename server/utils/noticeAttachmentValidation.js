import {
    MAX_NOTICE_EMAIL_ATTACH_BYTES,
    MAX_NOTICE_PDF_BYTES,
    MAX_NOTICE_PDF_COUNT,
} from '../constants/noticeAttachments.js';

/**
 * Decide which attachment rows can be embedded in Graph email vs link-only.
 * @param {{ size_bytes: number }[]} rows
 */
export function partitionAttachmentsForEmail(rows) {
    const embed = [];
    const linkOnly = [];
    let running = 0;

    for (const row of rows || []) {
        const size = Number(row.size_bytes) || 0;
        if (size > MAX_NOTICE_PDF_BYTES) {
            linkOnly.push(row);
            continue;
        }
        if (running + size <= MAX_NOTICE_EMAIL_ATTACH_BYTES) {
            embed.push(row);
            running += size;
        } else {
            linkOnly.push(row);
        }
    }

    return { embed, linkOnly };
}

export function canAddMoreAttachments(keepCount, newCount) {
    return keepCount + newCount <= MAX_NOTICE_PDF_COUNT;
}
