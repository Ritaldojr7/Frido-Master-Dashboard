import multer from 'multer';
import { MAX_NOTICE_PDF_BYTES, MAX_NOTICE_PDF_COUNT } from '../constants/noticeAttachments.js';

const storage = multer.memoryStorage();

export const noticePdfUpload = multer({
    storage,
    limits: {
        files: MAX_NOTICE_PDF_COUNT,
        fileSize: MAX_NOTICE_PDF_BYTES,
    },
    fileFilter(_req, file, cb) {
        const mime = (file.mimetype || '').toLowerCase();
        const name = (file.originalname || '').toLowerCase();
        if (mime === 'application/pdf' || name.endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});
