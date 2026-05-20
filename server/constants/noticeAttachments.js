/** Max attachments per notice (create + edit combined). */
export const MAX_NOTICE_PDF_COUNT = 5;

/** Per-file limit aligned with Microsoft Graph sendMail practical cap. */
export const MAX_NOTICE_PDF_BYTES = 3 * 1024 * 1024;

/** Total bytes to attempt as Graph file attachments before link-only fallback. */
export const MAX_NOTICE_EMAIL_ATTACH_BYTES = 3 * 1024 * 1024;

export const NOTICE_PDF_MIME = 'application/pdf';

export const ALLOWED_NOTICE_ATTACHMENT_MIMES = [
    NOTICE_PDF_MIME,
    'image/png',
    'image/jpeg',
];

export const DEFAULT_NOTICE_BUCKET = 'notice-attachments';

/**
 * @param {{ mimetype?: string, originalname?: string }} file
 * @returns {string | null} canonical mime if allowed
 */
export function resolveNoticeAttachmentMime(file) {
    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();
    if (mime === NOTICE_PDF_MIME || name.endsWith('.pdf')) return NOTICE_PDF_MIME;
    if (mime === 'image/png' || name.endsWith('.png')) return 'image/png';
    if (
        mime === 'image/jpeg' ||
        mime === 'image/jpg' ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg')
    ) {
        return 'image/jpeg';
    }
    return null;
}

/** @param {string} mime */
export function extensionForNoticeMime(mime) {
    if (mime === NOTICE_PDF_MIME) return '.pdf';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/jpeg') return '.jpg';
    return '.bin';
}
