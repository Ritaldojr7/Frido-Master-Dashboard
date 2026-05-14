import {
    isAllowedCompanyEmail,
    normalizeEmail,
    normalizeRole,
    VALID_ROLES,
} from './security.js';

/**
 * Validate a single import row (CSV/XLSX → JSON). Used by API and tests.
 *
 * @param {Record<string, unknown>} raw - May use alternate keys (Email, Name, …)
 * @param {number} index - 0-based row index for error reporting
 * @returns {{ ok: boolean, email: string, name: string, role: string, department: string, store_name: string, rowIndex: number, errors: string[] }}
 */
export function validateImportRow(raw, index = 0) {
    const pick = (keys) => {
        for (const k of keys) {
            if (raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
                return raw[k];
            }
        }
        const lower = {};
        for (const [rk, rv] of Object.entries(raw)) {
            lower[String(rk).trim().toLowerCase()] = rv;
        }
        for (const k of keys) {
            const lk = k.toLowerCase();
            if (lower[lk] !== undefined && lower[lk] !== null && String(lower[lk]).trim() !== '') {
                return lower[lk];
            }
        }
        return '';
    };

    const emailRaw = pick(['email', 'Email', 'EMAIL', 'mail']);
    const nameRaw = pick(['name', 'Name', 'NAME', 'full_name', 'Full Name']);
    const roleRaw = pick(['role', 'Role', 'ROLE']);
    const departmentRaw = pick(['department', 'Department', 'DEPARTMENT', 'dept']);
    const storeRaw = pick(['store_name', 'store', 'Store', 'STORE']);

    const email = normalizeEmail(emailRaw);
    const name = String(nameRaw ?? '').trim();
    let role = normalizeRole(roleRaw);
    const department = departmentRaw != null ? String(departmentRaw).trim() : '';
    const store_name = storeRaw != null ? String(storeRaw).trim() : '';

    const errors = [];

    if (!email) errors.push('email is required');
    if (!name) errors.push('name is required');
    if (!roleRaw || String(roleRaw).trim() === '') {
        errors.push('role is required');
    } else {
        const rl = String(roleRaw).toLowerCase().trim();
        if (!VALID_ROLES.includes(rl)) {
            errors.push(`invalid role "${roleRaw}" (allowed: ${VALID_ROLES.join(', ')})`);
        }
        role = normalizeRole(roleRaw);
    }
    if (email && !isAllowedCompanyEmail(email)) {
        errors.push('email domain is not approved for invites');
    }

    return {
        ok: errors.length === 0,
        email,
        name,
        role,
        department,
        store_name,
        rowIndex: index,
        errors,
    };
}
