/**
 * Branded transactional email templates.
 * Delivery is handled by Microsoft Graph in graphEmail.js.
 *
 * Logos are embedded inline (CID) so they render for every recipient; plain
 * http(s) URLs pointing at localhost break when the inbox tries to fetch them.
 */
import { sendGraphMail } from './graphEmail.js';
import { getBrandImagesForEmail } from './emailAssets.js';

const APP_NAME = 'Frido Dashboard';
const APP_URL = process.env.APP_URL || 'http://localhost:4000';
/** Fallback only when PNG files are missing on disk */
const EMAIL_HEADER_LOGO_URL =
    process.env.EMAIL_HEADER_LOGO_URL ||
    `${APP_URL}/brand/email/frido_logo_yellow_banner.png`;
const BRAND_FOOTER_LOGO_URL =
    process.env.BRAND_FOOTER_LOGO_URL || `${APP_URL}/brand/footer_logo.png`;
const SUPPORT_CONTACT = process.env.SUPPORT_CONTACT || 'support@myfrido.com';
const COMPANY_NAME = 'Frido';

const ROLE_LABEL = {
    admin: 'Administrator',
    manager: 'Manager',
    staff: 'Team Member',
};

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Common branded HTML wrapper. Uses table-based layout for broad email-client
 * support (Outlook, Gmail, Apple Mail). Fonts rely on the recipient device's
 * system stack so the email never looks templated or AI-generated.
 */
function wrapHtml({ previewText = '', body, headerImgSrc, footerImgSrc }) {
    const fontStack = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${fontStack};color:#1f2937;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${previewText}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
        <tr>
            <td align="center" style="padding:24px 12px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:6px;overflow:hidden;">
                    <tr>
                        <td align="center" style="background-color:#000000;padding:22px 24px;">
                            <img src="${headerImgSrc}" alt="${COMPANY_NAME}" width="240" style="display:block;border:0;outline:none;text-decoration:none;width:240px;max-width:85%;height:auto;margin:0 auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 36px 24px 36px;font-family:${fontStack};color:#1f2937;font-size:15px;line-height:1.6;">
                            ${body}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#0a0a0a;padding:24px 36px;font-family:${fontStack};color:#cbd5e1;font-size:13px;line-height:1.6;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td valign="top" style="padding-bottom:8px;">
                                        <img src="${footerImgSrc}" alt="${COMPANY_NAME}" height="28" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto;max-width:160px;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color:#cbd5e1;font-size:13px;">Best regards,<br><strong style="color:#ffffff;">The ${COMPANY_NAME} Team</strong></td>
                                </tr>
                                <tr>
                                    <td style="padding-top:14px;color:#94a3b8;font-size:12px;line-height:1.6;">
                                        You received this message because your administrator added you to the ${APP_NAME}.<br>
                                        For help, contact <a href="mailto:${SUPPORT_CONTACT}" style="color:#fbbf24;text-decoration:none;">${SUPPORT_CONTACT}</a>.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
                <p style="margin:14px 0 0 0;color:#9ca3af;font-family:${fontStack};font-size:11px;">© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function primaryButton(label, url) {
    const fontStack = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto;">
        <tr>
            <td bgcolor="#0a0a0a" style="border-radius:6px;">
                <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${fontStack};font-size:15px;font-weight:700;color:#facc15;background-color:#0a0a0a;border-radius:6px;text-decoration:none;letter-spacing:0.3px;">${label}</a>
            </td>
        </tr>
    </table>`;
}

function resolveImageSources() {
    const { headerSrc, footerSrc, attachments } = getBrandImagesForEmail();
    return {
        headerImgSrc: headerSrc || EMAIL_HEADER_LOGO_URL,
        footerImgSrc: footerSrc || BRAND_FOOTER_LOGO_URL,
        attachments,
    };
}

/**
 * Send an invitation email to a new user.
 */
export async function sendInviteEmail(params) {
    const { toEmail, toName, inviteLink, inviterName, inviterEmail, role } = params;
    const safeName = escapeHtml(toName);
    const safeInviter = escapeHtml(inviterName);
    const roleLabel = ROLE_LABEL[role] || 'Team Member';
    const inviterLine = inviterEmail
        ? `<strong>${safeInviter}</strong> (${escapeHtml(inviterEmail)})`
        : `<strong>${safeInviter}</strong>`;

    const body = `
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0f172a;">Hi ${safeName},</h1>
        <p style="margin:0 0 14px 0;">${inviterLine} has invited you to access the ${APP_NAME} as a <strong>${roleLabel}</strong>.</p>
        <p style="margin:0 0 14px 0;">Use the button below to set a password and finish creating your account. The link is unique to you and can only be used once.</p>
        ${primaryButton('Accept Invite', inviteLink)}
        <p style="margin:0 0 8px 0;color:#475569;font-size:13px;">This invitation expires in 7 days. If it is no longer needed, you can ignore this email.</p>
        <p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all;">If the button does not work, copy and paste this link into your browser:<br>${inviteLink}</p>
    `;

    const subject = `${inviterName} invited you to ${APP_NAME}`;
    const { headerImgSrc, footerImgSrc, attachments } = resolveImageSources();
    const html = wrapHtml({
        previewText: `${inviterName} has invited you to access the ${APP_NAME}.`,
        body,
        headerImgSrc,
        footerImgSrc,
    });

    return sendGraphMail({ toEmail, toName, subject, html, attachments });
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(toEmail, toName, resetToken) {
    const safeName = escapeHtml(toName);
    const resetLink = `${APP_URL}?reset=${resetToken}`;
    const body = `
        <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#0f172a;">Hi ${safeName},</h1>
        <p style="margin:0 0 14px 0;">We received a request to reset the password on your ${APP_NAME} account.</p>
        <p style="margin:0 0 14px 0;">Click the button below to choose a new password. This link is valid for the next hour.</p>
        ${primaryButton('Reset Password', resetLink)}
        <p style="margin:0 0 8px 0;color:#475569;font-size:13px;">If you did not request this, you can safely ignore this email — your password will remain unchanged.</p>
        <p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all;">If the button does not work, copy and paste this link into your browser:<br>${resetLink}</p>
    `;

    const { headerImgSrc, footerImgSrc, attachments } = resolveImageSources();
    const html = wrapHtml({
        previewText: `Reset your ${APP_NAME} password.`,
        body,
        headerImgSrc,
        footerImgSrc,
    });

    return sendGraphMail({ toEmail, toName, subject: `${APP_NAME} — Password reset`, html, attachments });
}
