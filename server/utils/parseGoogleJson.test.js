import { describe, expect, it } from 'vitest';
import { parseGoogleServiceAccountJson } from './parseGoogleJson.js';

describe('parseGoogleServiceAccountJson', () => {
    it('returns null for empty or undefined input', () => {
        expect(parseGoogleServiceAccountJson('')).toBeNull();
        expect(parseGoogleServiceAccountJson(null)).toBeNull();
        expect(parseGoogleServiceAccountJson(undefined)).toBeNull();
    });

    it('parses valid minified JSON object', () => {
        const json = JSON.stringify({
            type: 'service_account',
            private_key: '-----BEGIN KEY-----\\nABC123\\n-----END KEY-----',
        });
        const parsed = parseGoogleServiceAccountJson(json);
        expect(parsed.type).toBe('service_account');
        expect(parsed.private_key).toBe('-----BEGIN KEY-----\nABC123\n-----END KEY-----');
    });

    it('parses Base64 encoded JSON string', () => {
        const jsonObj = {
            type: 'service_account',
            client_email: 'test@example.com',
            private_key: 'line1\\nline2',
        };
        const base64 = Buffer.from(JSON.stringify(jsonObj)).toString('base64');
        const parsed = parseGoogleServiceAccountJson(base64);
        expect(parsed.client_email).toBe('test@example.com');
        expect(parsed.private_key).toBe('line1\nline2');
    });

    it('throws descriptive error on unfixable invalid JSON', () => {
        expect(() => parseGoogleServiceAccountJson('{ invalid_json }')).toThrow(
            'GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON'
        );
    });
});
