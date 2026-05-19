import { describe, it, expect } from 'vitest';
import {
    canAddMoreAttachments,
    partitionAttachmentsForEmail,
} from './noticeAttachmentValidation.js';

describe('noticeAttachmentValidation', () => {
    it('canAddMoreAttachments enforces max 5', () => {
        expect(canAddMoreAttachments(3, 2)).toBe(true);
        expect(canAddMoreAttachments(5, 0)).toBe(true);
        expect(canAddMoreAttachments(3, 3)).toBe(false);
    });

    it('partitionAttachmentsForEmail splits by total size budget', () => {
        const rows = [
            { id: '1', file_name: 'a.pdf', size_bytes: 1_000_000, storage_path: 'a', notice_id: 'n' },
            { id: '2', file_name: 'b.pdf', size_bytes: 2_500_000, storage_path: 'b', notice_id: 'n' },
            { id: '3', file_name: 'c.pdf', size_bytes: 500_000, storage_path: 'c', notice_id: 'n' },
        ];
        const { embed, linkOnly } = partitionAttachmentsForEmail(rows);
        expect(embed.length).toBeGreaterThanOrEqual(1);
        expect(embed.length + linkOnly.length).toBe(3);
    });
});
