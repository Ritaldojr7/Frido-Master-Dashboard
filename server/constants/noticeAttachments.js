/** Max PDFs per notice (create + edit combined). */
export const MAX_NOTICE_PDF_COUNT = 5;

/** Per-file limit aligned with Microsoft Graph sendMail practical cap. */
export const MAX_NOTICE_PDF_BYTES = 3 * 1024 * 1024;

/** Total bytes to attempt as Graph file attachments before link-only fallback. */
export const MAX_NOTICE_EMAIL_ATTACH_BYTES = 3 * 1024 * 1024;

export const NOTICE_PDF_MIME = 'application/pdf';

export const DEFAULT_NOTICE_BUCKET = 'notice-attachments';
