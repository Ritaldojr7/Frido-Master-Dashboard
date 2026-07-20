import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildPgSslConfig } from './pgSsl.js';

const tempFiles = [];

function writeTempCert(contents) {
    const file = path.join(os.tmpdir(), `frido-ca-${Date.now()}-${Math.random()}.pem`);
    fs.writeFileSync(file, contents);
    tempFiles.push(file);
    return file;
}

afterEach(() => {
    while (tempFiles.length) {
        try {
            fs.unlinkSync(tempFiles.pop());
        } catch {
            /* already gone */
        }
    }
});

const PEM = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n';

describe('buildPgSslConfig', () => {
    it('disables TLS entirely for PGSSLMODE=disable', () => {
        expect(buildPgSslConfig({ PGSSLMODE: 'disable' })).toBe(false);
    });

    it('PGSSLMODE=disable wins over a configured CA', () => {
        expect(buildPgSslConfig({ PGSSLMODE: 'disable', PGSSLROOTCERT: PEM })).toBe(false);
    });

    // Env vars routinely arrive with surrounding whitespace, so the inline value is
    // trimmed; the file path below preserves file contents verbatim.
    it('verifies against an inline PEM', () => {
        expect(buildPgSslConfig({ PGSSLROOTCERT: `  ${PEM}  ` })).toEqual({
            rejectUnauthorized: true,
            ca: PEM.trim(),
        });
    });

    it('verifies against a CA file path', () => {
        const file = writeTempCert(PEM);

        expect(buildPgSslConfig({ PGSSLROOTCERT: file })).toEqual({
            rejectUnauthorized: true,
            ca: PEM,
        });
    });

    it('verifies against the system trust store when PGSSL_VERIFY=true', () => {
        expect(buildPgSslConfig({ PGSSL_VERIFY: 'true' })).toEqual({ rejectUnauthorized: true });
    });

    it('falls back to unverified TLS when nothing is configured', () => {
        expect(buildPgSslConfig({})).toEqual({ rejectUnauthorized: false });
    });

    it('falls back to unverified TLS when the CA file is unreadable', () => {
        expect(buildPgSslConfig({ PGSSLROOTCERT: '/no/such/ca.pem' })).toEqual({
            rejectUnauthorized: false,
        });
    });

    it('ignores a whitespace-only PGSSLROOTCERT', () => {
        expect(buildPgSslConfig({ PGSSLROOTCERT: '   ' })).toEqual({ rejectUnauthorized: false });
    });
});
