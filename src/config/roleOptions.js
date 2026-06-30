/** Assignable roles for admin user management (order = dropdown list). */
export const ROLE_OPTIONS = [
    { value: 'staff', label: 'Staff' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'executive', label: 'Executive' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'data_analyst', label: 'Data Analyst' },
    { value: 'orm_lead', label: 'ORM Lead' },
    { value: 'admin', label: 'Admin' },
];

export const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.value, o.label]));

export function formatRolesSummary(roles) {
    const list = Array.isArray(roles) ? roles : [roles].filter(Boolean);
    if (list.length === 0) return 'Select roles';
    if (list.includes('admin')) return 'Admin';
    if (list.length === 1) return ROLE_LABELS[list[0]] || list[0];
    if (list.length === 2) {
        return list.map((r) => ROLE_LABELS[r] || r).join(', ');
    }
    return `${list.length} roles`;
}

/** Apply admin-exclusive rule before persisting. */
export function normalizeRoleSelection(nextRoles, toggledRole, checked) {
    if (toggledRole === 'admin' && checked) {
        return ['admin'];
    }
    let next = checked
        ? [...new Set([...nextRoles.filter((r) => r !== 'admin'), toggledRole])]
        : nextRoles.filter((r) => r !== toggledRole);
    if (next.length === 0) return nextRoles;
    return next;
}
