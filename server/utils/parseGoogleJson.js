/**
 * Helper to safely parse GOOGLE_SERVICE_ACCOUNT_JSON from environment variables.
 * Handles raw JSON, minified JSON, multiline formatted JSON, and Base64-encoded strings.
 */
export function parseGoogleServiceAccountJson(raw) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) {
        return null;
    }

    let jsonStr = trimmed;

    // Handle Base64-encoded string (doesn't start with '{')
    if (!jsonStr.startsWith('{')) {
        try {
            const decoded = Buffer.from(jsonStr, 'base64').toString('utf-8').trim();
            if (decoded.startsWith('{')) {
                jsonStr = decoded;
            }
        } catch {
            // Keep original string if base64 decoding fails
        }
    }

    let credentials;
    try {
        credentials = JSON.parse(jsonStr);
    } catch (err) {
        // Attempt fallback recovery for unescaped literal newlines in multiline JSON paste
        try {
            const sanitized = jsonStr.replace(/[\r\n]+/g, '\\n');
            credentials = JSON.parse(sanitized);
        } catch {
            throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON: ${err.message}`);
        }
    }

    if (credentials && typeof credentials === 'object' && credentials.private_key) {
        credentials.private_key = String(credentials.private_key).replace(/\\n/g, '\n');
    }

    return credentials;
}
