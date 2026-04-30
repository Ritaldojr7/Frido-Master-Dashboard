/**
 * Load Frido logo PNGs from disk for inline (CID) embedding in transactional email.
 * Remote <img src="http://localhost/..."> fails for recipients — inline attachments fix that.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..', '..');

export const CID_EMAIL_HEADER = 'frido-email-header';
export const CID_EMAIL_FOOTER = 'frido-email-footer';

const DEFAULT_HEADER_FILE = path.join(PROJECT_ROOT, 'src', 'assets', 'email', 'frido_logo_yellow_banner.png');
const DEFAULT_FOOTER_FILE = path.join(PROJECT_ROOT, 'src', 'assets', 'footer_logo.png');

/**
 * @returns {{ headerSrc: string, footerSrc: string, attachments: object[] }}
 */
export function getBrandImagesForEmail() {
    const attachments = [];

    let headerSrc = null;
    let footerSrc = null;

    const headerPath = process.env.EMAIL_HEADER_LOGO_PATH || DEFAULT_HEADER_FILE;
    const footerPath = process.env.EMAIL_FOOTER_LOGO_PATH || DEFAULT_FOOTER_FILE;

    if (fs.existsSync(headerPath)) {
        attachments.push(
            fileAttachment({
                filename: 'frido-header.png',
                cid: CID_EMAIL_HEADER,
                mime: 'image/png',
                filePath: headerPath,
            })
        );
        headerSrc = `cid:${CID_EMAIL_HEADER}`;
    }

    if (fs.existsSync(footerPath)) {
        attachments.push(
            fileAttachment({
                filename: 'frido-footer.png',
                cid: CID_EMAIL_FOOTER,
                mime: 'image/png',
                filePath: footerPath,
            })
        );
        footerSrc = `cid:${CID_EMAIL_FOOTER}`;
    }

    return { headerSrc, footerSrc, attachments };
}

function fileAttachment({ filename, cid, mime, filePath }) {
    const bytes = fs.readFileSync(filePath);
    return {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: filename,
        contentType: mime,
        contentBytes: bytes.toString('base64'),
        contentId: cid,
        isInline: true,
    };
}
