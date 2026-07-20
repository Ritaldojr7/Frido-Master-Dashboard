/**
 * Postgres TLS configuration.
 *
 * `rejectUnauthorized: false` encrypts the connection but skips certificate verification,
 * which leaves it open to interception. Prefer verification; fall back only when the
 * operator has explicitly opted out or when no trust anchor is available.
 */
import fs from 'fs';

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {false | { rejectUnauthorized: boolean, ca?: string }}
 */
export function buildPgSslConfig(env = process.env) {
    // Local/dev escape hatch — plaintext connection, no TLS negotiated at all.
    if (env.PGSSLMODE === 'disable') {
        return false;
    }

    const rootCert = String(env.PGSSLROOTCERT ?? '').trim();

    if (rootCert) {
        const ca = rootCert.startsWith('-----BEGIN') ? rootCert : readCertFile(rootCert);
        if (ca) {
            return { rejectUnauthorized: true, ca };
        }
    }

    // Supabase's endpoints present a publicly-trusted certificate, so Node's bundled CA
    // store is normally sufficient. Opt in explicitly rather than defaulting to it, so an
    // environment with a private CA fails loudly at connect time instead of silently
    // downgrading.
    if (String(env.PGSSL_VERIFY ?? '').trim().toLowerCase() === 'true') {
        return { rejectUnauthorized: true };
    }

    // SECURITY: certificate verification is disabled. The connection is encrypted but not
    // authenticated, so it is vulnerable to an active MITM between this service and the
    // database. Set PGSSL_VERIFY=true (system trust store) or PGSSLROOTCERT (explicit CA)
    // to close this. Left as the default only to avoid breaking existing deployments on
    // upgrade — it should not remain the production setting.
    return { rejectUnauthorized: false };
}

function readCertFile(certPath) {
    try {
        return fs.readFileSync(certPath, 'utf8');
    } catch (err) {
        console.error(
            `[db] PGSSLROOTCERT is set but could not be read (${certPath}): ${err.message}. ` +
                'Falling back to unverified TLS.'
        );
        return null;
    }
}
