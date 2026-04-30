let cachedToken = null;
let cachedTokenExpiresAt = 0;

function hasGraphConfig() {
    return Boolean(
        process.env.MS_TENANT_ID &&
        process.env.MS_CLIENT_ID &&
        process.env.MS_CLIENT_SECRET &&
        process.env.MS_INVITE_SENDER
    );
}

async function getAccessToken() {
    if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
        return cachedToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        client_id: process.env.MS_CLIENT_ID,
        client_secret: process.env.MS_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Microsoft Graph authentication failed');
    }

    cachedToken = data.access_token;
    cachedTokenExpiresAt = Date.now() + (Number(data.expires_in || 3600) * 1000);
    return cachedToken;
}

export async function sendGraphMail({ toEmail, toName, subject, html, attachments = [] }) {
    if (!hasGraphConfig()) {
        console.log('\nEMAIL (console fallback - Microsoft Graph not configured):');
        console.log(`   To: ${toName} <${toEmail}>`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Body: ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`);
        if (attachments?.length) {
            console.log(`   (${attachments.length} inline image(s) would be embedded via Graph sendMail)\n`);
        }
        return { status: 'logged', message: 'Email logged to console (Microsoft Graph not configured)' };
    }

    const token = await getAccessToken();
    const sender = process.env.MS_INVITE_SENDER;
    const message = {
        subject,
        body: {
            contentType: 'HTML',
            content: html,
        },
        toRecipients: [
            {
                emailAddress: {
                    address: toEmail,
                    name: toName,
                },
            },
        ],
    };
    if (attachments?.length) {
        message.attachments = attachments;
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message,
            saveToSentItems: false,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Microsoft Graph sendMail failed (${response.status}): ${text}`);
    }

    return { status: 'sent' };
}
