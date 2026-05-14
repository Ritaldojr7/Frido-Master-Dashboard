import {
    isAllowedCompanyEmail,
    normalizeEmail,
    normalizeRole,
    VALID_ROLES,
} from './security.js';
import {
    IMPORT_FIELD_KEYS,
    normalizeImportRecordKeys,
    pickImportField,
} from '../../src/utils/adminImportNormalize.js';

/**
 * Validate a single import row (CSV/XLSX → JSON). Used by API and tests.
 *
 * @param {Record<string, unknown>} raw - May use alternate keys (Email, Name, …)
 * @param {number} index - 0-based row index for error reporting
 * @returns {{ ok: boolean, email: string, name: string, role: string, department: string, store_name: string, rowIndex: number, errors: string[] }}
 */
export function validateImportRow(rawInput, index = 0) {
    const raw = normalizeImportRecordKeys(rawInput);

    const emailRaw = pickImportField(raw, IMPORT_FIELD_KEYS.email);
    const nameRaw = pickImportField(raw, IMPORT_FIELD_KEYS.name);
    const roleRaw = pickImportField(raw, IMPORT_FIELD_KEYS.role);
    const departmentRaw = pickImportField(raw, IMPORT_FIELD_KEYS.department);
    const storeRaw = pickImportField(raw, IMPORT_FIELD_KEYS.store_name);

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
