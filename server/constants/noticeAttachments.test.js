import { describe, it, expect } from 'vitest';
import { extensionForNoticeMime, resolveNoticeAttachmentMime } from './noticeAttachments.js';

describe('noticeAttachments constants', () => {
    it('resolveNoticeAttachmentMime accepts PDF, PNG, JPEG', () => {
        expect(resolveNoticeAttachmentMime({ mimetype: 'application/pdf', originalname: 'a.pdf' })).toBe(
            'application/pdf'
        );
        expect(resolveNoticeAttachmentMime({ mimetype: 'image/png', originalname: 'a.png' })).toBe('image/png');
        expect(resolveNoticeAttachmentMime({ mimetype: 'image/jpeg', originalname: 'a.jpg' })).toBe('image/jpeg');
        expect(resolveNoticeAttachmentMime({ mimetype: '', originalname: 'photo.jpeg' })).toBe('image/jpeg');
        expect(resolveNoticeAttachmentMime({ mimetype: 'text/plain', originalname: 'a.txt' })).toBeNull();
    });

    it('extensionForNoticeMime maps mime to extension', () => {
        expect(extensionForNoticeMime('application/pdf')).toBe('.pdf');
        expect(extensionForNoticeMime('image/png')).toBe('.png');
        expect(extensionForNoticeMime('image/jpeg')).toBe('.jpg');
    });
});
