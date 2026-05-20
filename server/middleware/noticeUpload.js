import multer from 'multer';
import {
    MAX_NOTICE_PDF_BYTES,
    MAX_NOTICE_PDF_COUNT,
    resolveNoticeAttachmentMime,
} from '../constants/noticeAttachments.js';

const storage = multer.memoryStorage();

export const noticePdfUpload = multer({
    storage,
    limits: {
        files: MAX_NOTICE_PDF_COUNT,
        fileSize: MAX_NOTICE_PDF_BYTES,
    },
    fileFilter(_req, file, cb) {
        if (resolveNoticeAttachmentMime(file)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, PNG, and JPEG files are allowed'));
        }
    },
});
