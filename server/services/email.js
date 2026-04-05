/**
 * Azure Communication Services — Email Service
 * Handles sending invitation and password-reset emails.
 *
 * Required env vars:
 *   AZURE_EMAIL_CONNECTION_STRING — ACS connection string
 *   AZURE_EMAIL_SENDER           — verified sender address (e.g., DoNotReply@xxxx.azurecomm.net)
 */
import { EmailClient } from '@azure/communication-email';

let emailClient = null;

function getClient() {
    if (!emailClient) {
        const connectionString = process.env.AZURE_EMAIL_CONNECTION_STRING;
        if (!connectionString) {
            console.warn('⚠ AZURE_EMAIL_CONNECTION_STRING not set — emails will be logged to console');
            return null;
        }
        emailClient = new EmailClient(connectionString);
    }
    return emailClient;
}

const SENDER = () => process.env.AZURE_EMAIL_SENDER || 'DoNotReply@myfrido.com';
const APP_NAME = 'Frido Master Dashboard';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Common HTML wrapper for branded emails.
 */
function wrapHtml(body) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e1a; color: #f1f5f9; margin: 0; padding: 0; }
            .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
            .card { background: #1e293b; border-radius: 16px; padding: 40px 32px; border: 1px solid rgba(148,163,184,0.12); }
            .logo { font-size: 28px; font-weight: 800; margin-bottom: 32px; }
            .logo span { color: #f59e0b; }
            h1 { font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #f1f5f9; }
            p { font-size: 15px; line-height: 1.7; color: #94a3b8; margin: 0 0 16px; }
            .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; margin: 8px 0 24px; }
            .code-box { background: #0f172a; border: 1px solid rgba(148,163,184,0.15); border-radius: 10px; padding: 16px 20px; font-family: monospace; font-size: 18px; letter-spacing: 2px; color: #fbbf24; text-align: center; margin: 12px 0 24px; }
            .footer { text-align: center; padding-top: 24px; font-size: 12px; color: #64748b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="logo">⚡ <span>Frido</span></div>
                ${body}
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Frido — All rights reserved</p>
            </div>
        </div>
    </body>
    </html>`;
}

/**
 * Send an invitation email to a new user.
 */
export async function sendInviteEmail(toEmail, toName, tempPassword) {
    const html = wrapHtml(`
        <h1>Welcome to ${APP_NAME}!</h1>
        <p>Hi ${toName},</p>
        <p>You've been invited to join the Frido Master Dashboard. Use the credentials below to sign in:</p>
        <p style="color: #f1f5f9; font-weight: 600; margin-bottom: 4px;">Email</p>
        <div class="code-box">${toEmail}</div>
        <p style="color: #f1f5f9; font-weight: 600; margin-bottom: 4px;">Temporary Password</p>
        <div class="code-box">${tempPassword}</div>
        <a href="${APP_URL}" class="btn">Sign In to Dashboard →</a>
        <p style="font-size: 13px;">Please change your password after your first login for security.</p>
    `);

    return sendEmail(toEmail, toName, `You're invited to ${APP_NAME}`, html);
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(toEmail, toName, resetToken) {
    const resetLink = `${APP_URL}?reset=${resetToken}`;
    const html = wrapHtml(`
        <h1>Password Reset Request</h1>
        <p>Hi ${toName},</p>
        <p>We received a request to reset your password for the Frido Master Dashboard. Click the button below to set a new password:</p>
        <a href="${resetLink}" class="btn">Reset Password →</a>
        <p style="font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size: 12px; color: #64748b; word-break: break-all;">Direct link: ${resetLink}</p>
    `);

    return sendEmail(toEmail, toName, `${APP_NAME} — Password Reset`, html);
}

/**
 * Core send function — uses Azure or logs to console as fallback.
 */
async function sendEmail(toEmail, toName, subject, html) {
    const client = getClient();

    const message = {
        senderAddress: SENDER(),
        content: {
            subject,
            html,
        },
        recipients: {
            to: [{ address: toEmail, displayName: toName }],
        },
    };

    if (!client) {
        console.log('\n📧 EMAIL (console fallback — Azure not configured):');
        console.log(`   To: ${toName} <${toEmail}>`);
        console.log(`   Subject: ${subject}`);
        console.log(`   (HTML body omitted)\n`);
        return { status: 'logged', message: 'Email logged to console (Azure not configured)' };
    }

    try {
        const poller = await client.beginSend(message);
        const result = await poller.pollUntilDone();
        console.log(`✓ Email sent to ${toEmail}: ${result.id}`);
        return { status: 'sent', id: result.id };
    } catch (err) {
        console.error(`✗ Failed to send email to ${toEmail}:`, err.message);
        throw err;
    }
}
