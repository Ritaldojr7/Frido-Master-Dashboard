import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
    stripLeadingBom,
    detectCsvDelimiter,
    normalizeImportHeaderKey,
    normalizeImportedRows,
    pickImportField,
    IMPORT_FIELD_KEYS,
} from '../utils/adminImportNormalize';
import { apiFetch, useAuth } from '../context/AuthContext';
import './Admin.css';

export default function Admin() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showNoticeModal, setShowNoticeModal] = useState(false);

    // Invite form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState('staff');
    const [inviteStoreName, setInviteStoreName] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMessage, setInviteMessage] = useState('');
    const [inviteWarning, setInviteWarning] = useState('');
    const [inviteLink, setInviteLink] = useState('');

    const [showImportModal, setShowImportModal] = useState(false);
    const [importParsedRows, setImportParsedRows] = useState([]);
    const [importFileLabel, setImportFileLabel] = useState('');
    const [importParseError, setImportParseError] = useState('');
    const [importSubmitLoading, setImportSubmitLoading] = useState(false);
    const [importResultSummary, setImportResultSummary] = useState('');
    const [selectedIds, setSelectedIds] = useState({});
    const [bulkInviteLoading, setBulkInviteLoading] = useState(false);
    const [bulkInviteMessage, setBulkInviteMessage] = useState('');

    // Notice form
    const [notices, setNotices] = useState([]);
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeBody, setNoticeBody] = useState('');
    const [noticePriority, setNoticePriority] = useState('normal');
    const [noticeRequiresAck, setNoticeRequiresAck] = useState(true);
    const [noticeSender, setNoticeSender] = useState('');
    const [noticeLoading, setNoticeLoading] = useState(false);
    const [noticeMessage, setNoticeMessage] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            const data = await apiFetch('/api/users');
            setUsers(data.users);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchNotices = useCallback(async () => {
        try {
            const data = await apiFetch('/api/notices/admin');
            setNotices(data.notices || []);
        } catch (err) {
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchNotices();
    }, [fetchUsers, fetchNotices]);

    useEffect(() => {
        if (user?.name) {
            setNoticeSender(user.name);
        }
    }, [user]);

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        setInviteMessage('');
        setInviteWarning('');
        setInviteLink('');

        try {
            const data = await apiFetch('/api/users/invite', {
                method: 'POST',
                body: JSON.stringify({ 
                    email: inviteEmail, 
                    name: inviteName, 
                    role: inviteRole,
                    store_name: inviteRole === 'staff' ? inviteStoreName : ''
                }),
            });
            fetchUsers();
            if (data?.warning) {
                setInviteWarning(data.warning);
                setInviteLink(data.inviteLink || '');
                setInviteMessage('');
            } else {
                setInviteMessage('Invitation sent successfully!');
                setInviteEmail('');
                setInviteName('');
                setInviteRole('staff');
                setInviteStoreName('');
                setTimeout(() => { setShowInviteModal(false); setInviteMessage(''); }, 1500);
            }
        } catch (err) {
            setInviteMessage(err.message || 'Failed to send invitation');
        } finally {
            setInviteLoading(false);
        }
    };

    const copyInviteLink = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            setInviteMessage('Link copied to clipboard');
            setTimeout(() => setInviteMessage(''), 1500);
        } catch {
            setInviteMessage('Copy failed — select and copy manually.');
        }
    };

    const handleCreateNotice = async (e) => {
        e.preventDefault();
        setNoticeLoading(true);
        setNoticeMessage('');

        try {
            await apiFetch('/api/notices/admin', {
                method: 'POST',
                body: JSON.stringify({
                    title: noticeTitle,
                    body: noticeBody,
                    priority: noticePriority,
                    requires_ack: noticeRequiresAck,
                    sent_by_name: noticeSender,
                }),
            });
            setNoticeMessage('Notice published successfully!');
            setNoticeTitle('');
            setNoticeBody('');
            setNoticePriority('normal');
            setNoticeRequiresAck(true);
            setNoticeSender(user?.name || '');
            fetchNotices();
            setTimeout(() => { setShowNoticeModal(false); setNoticeMessage(''); }, 1200);
        } catch (err) {
            setNoticeMessage(err.message || 'Failed to publish notice');
        } finally {
            setNoticeLoading(false);
        }
    };

    const handleNoticeStatus = async (noticeId, active) => {
        try {
            await apiFetch(`/api/notices/admin/${noticeId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ active }),
            });
            fetchNotices();
        } catch (err) {
            alert(err.message || 'Failed to update notice');
        }
    };

    const handleDeleteNotice = async (noticeId, noticeTitle) => {
        const ok = confirm(
            `Delete this notice permanently?\n\n` +
            `Title: ${noticeTitle}\n\n` +
            `This will remove it for all staff and delete acknowledgement history for this notice.`
        );
        if (!ok) return;
        try {
            const attempts = [
                { url: `/api/notices/admin/${noticeId}`, method: 'DELETE' },
                { url: `/api/notices/admin/${noticeId}/delete`, method: 'POST' },
                { url: `/api/notices/${noticeId}`, method: 'DELETE' },
                { url: `/api/notices/${noticeId}/delete`, method: 'POST' },
            ];

            let deleted = false;
            let lastErr = null;
            for (const attempt of attempts) {
                try {
                    await apiFetch(attempt.url, { method: attempt.method });
                    deleted = true;
                    break;
                } catch (err) {
                    lastErr = err;
                }
            }

            if (!deleted && lastErr) {
                throw lastErr;
            }
            fetchNotices();
        } catch (err) {
            alert(err.message || 'Failed to delete notice');
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await apiFetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole }),
            });
            fetchUsers();
            alert(`Role updated to ${newRole.toUpperCase()}. The user will need to logout and log back in for the changes to take full effect.`);
        } catch (err) {
            alert(err.message || 'Failed to update role');
        }
    };

    const handleDisable = async (userId, userName) => {
        if (!confirm(`Are you sure you want to disable ${userName}'s account?`)) return;
        try {
            await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
            fetchUsers();
        } catch (err) {
            alert(err.message || 'Failed to disable user');
        }
    };

    const handleReactivate = async (userId) => {
        try {
            await apiFetch(`/api/users/${userId}/reactivate`, { method: 'PUT' });
            fetchUsers();
        } catch (err) {
            alert(err.message || 'Failed to reactivate user');
        }
    };

    const handleDeleteAccount = async (userId, userName) => {
        const ok = confirm(
            `Permanently delete ${userName}?\n\n` +
            `The account will be locked immediately and the row will be erased from the database after 30 days. You can still restore it before then.`
        );
        if (!ok) return;
        try {
            await apiFetch(`/api/users/${userId}/permanent`, { method: 'DELETE' });
            fetchUsers();
        } catch (err) {
            alert(err.message || 'Failed to delete user');
        }
    };

    const handleRestore = async (userId) => {
        try {
            await apiFetch(`/api/users/${userId}/restore`, { method: 'PUT' });
            fetchUsers();
        } catch (err) {
            alert(err.message || 'Failed to restore user');
        }
    };

    const openImportModal = () => {
        setShowImportModal(true);
        setImportParsedRows([]);
        setImportFileLabel('');
        setImportParseError('');
        setImportResultSummary('');
    };

    const importPendingUsers = users.filter((u) => u.status === 'import_pending');
    const selectedCount = Object.keys(selectedIds).length;

    const toggleSelectUser = (id) => {
        setSelectedIds((prev) => {
            const next = { ...prev };
            if (next[id]) delete next[id];
            else next[id] = true;
            return next;
        });
    };

    const toggleSelectAllPending = (checked) => {
        if (!checked) {
            setSelectedIds({});
            return;
        }
        const next = {};
        importPendingUsers.forEach((u) => {
            next[u.id] = true;
        });
        setSelectedIds(next);
    };

    const allPendingSelected =
        importPendingUsers.length > 0 && importPendingUsers.every((u) => Boolean(selectedIds[u.id]));

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setImportFileLabel(file.name);
        setImportParseError('');
        setImportResultSummary('');

        const ext = file.name.split('.').pop()?.toLowerCase();

        try {
            if (ext === 'csv') {
                const rawText = await file.text();
                const text = stripLeadingBom(rawText);
                const delimiter = detectCsvDelimiter(text);
                const parsed = Papa.parse(text, {
                    header: true,
                    skipEmptyLines: 'greedy',
                    delimiter,
                    transformHeader: (h) => normalizeImportHeaderKey(h),
                });
                if (parsed.errors?.length > 0) {
                    const fatal = parsed.errors.find((err) => err.type === 'Quotes' || err.type === 'Delimiter');
                    if (fatal) {
                        setImportParseError(fatal.message || 'Could not parse CSV');
                        setImportParsedRows([]);
                        return;
                    }
                }
                const rows = normalizeImportedRows(parsed.data || []).filter((row) =>
                    Object.values(row || {}).some((v) => v != null && String(v).trim() !== '')
                );
                setImportParsedRows(rows);
                if (!rows.length) setImportParseError('No data rows found in CSV');
            } else if (ext === 'xlsx' || ext === 'xls') {
                const buf = await file.arrayBuffer();
                const wb = XLSX.read(buf, { type: 'array' });
                const sheetName = wb.SheetNames[0];
                if (!sheetName) {
                    setImportParseError('Spreadsheet has no sheets');
                    setImportParsedRows([]);
                    return;
                }
                const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
                const rows = normalizeImportedRows(Array.isArray(json) ? json : []).filter((row) =>
                    Object.values(row || {}).some((v) => v != null && String(v).trim() !== '')
                );
                setImportParsedRows(rows);
                if (!rows.length) setImportParseError('No data rows found in workbook');
            } else {
                setImportParsedRows([]);
                setImportParseError('Use a .csv, .xlsx, or .xls file.');
            }
        } catch (err) {
            setImportParsedRows([]);
            setImportParseError(err.message || 'Failed to read file');
        }
    };

    const handleImportConfirm = async () => {
        if (!importParsedRows.length) return;
        setImportSubmitLoading(true);
        setImportResultSummary('');
        try {
            const data = await apiFetch('/api/users/import', {
                method: 'POST',
                body: JSON.stringify({ rows: importParsedRows }),
            });
            const parts = [
                `${data.createdCount ?? 0} added to roster`,
                `${data.skipped?.length ?? 0} skipped`,
                `${data.errors?.length ?? 0} row errors`,
            ];
            setImportResultSummary(parts.join(' · '));
            await fetchUsers();
            setTimeout(() => {
                setShowImportModal(false);
                setImportResultSummary('');
                setImportParsedRows([]);
                setImportFileLabel('');
            }, 2000);
        } catch (err) {
            setImportParseError(err.message || 'Import request failed');
        } finally {
            setImportSubmitLoading(false);
        }
    };

    const downloadImportTemplate = () => {
        const csv =
            'email,name,role,department,store_name\r\njane.doe@myfrido.com,Jane Doe,staff,SALES,Bengaluru Store\r\n';
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-import-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBulkInvite = async () => {
        const userIds = Object.keys(selectedIds);
        if (!userIds.length || bulkInviteLoading) return;
        setBulkInviteLoading(true);
        setBulkInviteMessage('');
        try {
            const data = await apiFetch('/api/users/bulk-invite', {
                method: 'POST',
                body: JSON.stringify({ userIds }),
            });
            const results = data.results || [];
            const okCount = results.filter((r) => r.ok).length;
            const failCount = results.length - okCount;

            const nextSel = { ...selectedIds };
            results.forEach((r, i) => {
                const sentId = userIds[i];
                if (r?.ok && sentId) delete nextSel[sentId];
            });
            setSelectedIds(nextSel);

            const warnings = results.filter((r) => r.ok && r.warning);
            let msg = `Sent ${okCount} invitation email(s). ${failCount ? `${failCount} failed — retry selected rows.` : ''}`.trim();
            if (warnings.length) msg += ' Some invites need the link copied (email warning).';

            setBulkInviteMessage(msg);
            await fetchUsers();
            setTimeout(() => setBulkInviteMessage(''), 8000);
        } catch (err) {
            setBulkInviteMessage(err.message || 'Bulk invite failed');
        } finally {
            setBulkInviteLoading(false);
        }
    };

    const daysUntilPurge = (deletedAt) => {
        if (!deletedAt) return null;
        const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
        const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
        return days;
    };

    const roleBadgeClass = (role) => ({
        admin: 'admin__badge--amber',
        manager: 'admin__badge--purple',
        staff: 'admin__badge--blue',
        viewer: 'admin__badge--blue',
        feedback: 'admin__badge--emerald',
        executive: 'admin__badge--purple',
        team_lead: 'admin__badge--purple',
    }[role] || '');

    const statusClass = (status) => ({
        active: 'admin__status--active',
        invited: 'admin__status--invited',
        import_pending: 'admin__status--import-pending',
        disabled: 'admin__status--disabled',
    }[status] || '');

    const formatStatusLabel = (status) => {
        if (status === 'import_pending') return 'Import pending — send invite';
        return status;
    };

    return (
        <div className="admin">
            <div className="admin__header">
                <div>
                    <h1 className="admin__title">User Management</h1>
                    <p className="admin__subtitle">Manage team members, roles, and access permissions</p>
                </div>
                <div className="admin__header-actions">
                    <button
                        type="button"
                        className="admin__invite-btn"
                        onClick={openImportModal}
                        title="Import many users from CSV or Excel — then send invites in bulk."
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                        </svg>
                        Import users
                    </button>
                    <button
                        type="button"
                        className="admin__invite-btn"
                        onClick={() => setShowInviteModal(true)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        Invite user
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="admin__stats">
                <div className="admin__stat">
                    <span className="admin__stat-number">{users.length}</span>
                    <span className="admin__stat-label">Total Users</span>
                </div>
                <div className="admin__stat">
                    <span className="admin__stat-number">{users.filter(u => u.status === 'active').length}</span>
                    <span className="admin__stat-label">Active</span>
                </div>
                <div className="admin__stat">
                    <span className="admin__stat-number">{users.filter(u => u.role === 'admin').length}</span>
                    <span className="admin__stat-label">Admins</span>
                </div>
                <div className="admin__stat">
                    <span className="admin__stat-number">{users.filter((u) => u.status === 'invited' || u.status === 'import_pending').length}</span>
                    <span className="admin__stat-label">Pending</span>
                </div>
            </div>

            {/* Error */}
            {error && <div className="admin__error">{error}</div>}

            {(selectedCount > 0 || bulkInviteMessage) && (
                <div className="admin__bulk-bar">
                    {selectedCount > 0 ? (
                        <>
                            <span className="admin__bulk-bar-text">{selectedCount} selected (import pending)</span>
                            <button
                                type="button"
                                className="admin__bulk-bar-btn admin__bulk-bar-btn--primary"
                                disabled={bulkInviteLoading}
                                onClick={() => handleBulkInvite()}
                            >
                                {bulkInviteLoading ? 'Sending…' : 'Send invitation emails'}
                            </button>
                            <button
                                type="button"
                                className="admin__bulk-bar-btn"
                                disabled={bulkInviteLoading}
                                onClick={() => setSelectedIds({})}
                            >
                                Clear selection
                            </button>
                        </>
                    ) : null}
                    {bulkInviteMessage ? (
                        <span className="admin__bulk-bar-msg">{bulkInviteMessage}</span>
                    ) : null}
                </div>
            )}

            {/* Users Table */}
            <div className="admin__table-card">
                {loading ? (
                    <div className="admin__loading">Loading users...</div>
                ) : (
                    <div className="admin__table-scroll">
                        <table className="admin__table">
                            <thead>
                                <tr>
                                    <th className="admin__th-checkbox" scope="col">
                                        <input
                                            type="checkbox"
                                            className="admin__row-checkbox"
                                            checked={allPendingSelected}
                                            disabled={importPendingUsers.length === 0}
                                            title="Select all users awaiting invite email"
                                            onChange={(e) => toggleSelectAllPending(e.target.checked)}
                                        />
                                    </th>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Department</th>
                                    <th>Last Login</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const nameStr = String(u.name || '').trim();
                                    const userInitials = nameStr
                                        ? nameStr.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                                        : '–';
                                    const avatarSrc = typeof u.avatar_url === 'string' ? u.avatar_url.trim() : '';
                                    const pendingDelete = Boolean(u.deleted_at);
                                    const remainingDays = daysUntilPurge(u.deleted_at);
                                    const rowClasses = ['admin__row--disabled', 'admin__row--deleted']
                                        .filter((cls) =>
                                            (cls === 'admin__row--disabled' && (u.status === 'disabled' || pendingDelete)) ||
                                            (cls === 'admin__row--deleted' && pendingDelete)
                                        )
                                        .join(' ');
                                    return (
                                        <tr key={u.id} className={rowClasses}>
                                            <td className="admin__td-checkbox">
                                                {u.status === 'import_pending' ? (
                                                    <input
                                                        type="checkbox"
                                                        className="admin__row-checkbox"
                                                        checked={Boolean(selectedIds[u.id])}
                                                        onChange={() => toggleSelectUser(u.id)}
                                                        title="Include in bulk invitation email send"
                                                        aria-label={`Select ${nameStr || u.email} for invite email`}
                                                    />
                                                ) : null}
                                            </td>
                                            <td>
                                                <div className="admin__user-cell">
                                                    <div className="admin__user-avatar">
                                                        {avatarSrc ? (
                                                            <img
                                                                src={avatarSrc}
                                                                alt={`${nameStr || 'User'} avatar`}
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        ) : (
                                                            <span>{userInitials}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="admin__user-name">{u.name}</span>
                                                        <span className="admin__user-email">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    className={`admin__role-select ${roleBadgeClass(u.role)}`}
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    disabled={u.status === 'disabled' || pendingDelete}
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="staff">Staff</option>
                                                    <option value="viewer">Viewer</option>
                                                    <option value="feedback">Feedback</option>
                                                    <option value="executive">Executive (ISD NM only)</option>
                                                    <option value="team_lead">Team Lead (ISD NM only)</option>
                                                </select>
                                            </td>
                                            <td>
                                                {pendingDelete ? (
                                                    <span className="admin__status admin__status--deleted" title={`Will be permanently removed in ${remainingDays} day${remainingDays === 1 ? '' : 's'}`}>
                                                        Deletes in {remainingDays}d
                                                    </span>
                                                ) : (
                                                    <span className={`admin__status ${statusClass(u.status)}`}>
                                                        {formatStatusLabel(u.status)}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="admin__dept-cell">
                                                    <span className="admin__dept">{u.department || '—'}</span>
                                                    {u.store_name && <span className="admin__store-tag">{u.store_name}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="admin__date">
                                                    {u.last_login
                                                        ? new Date(u.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                        : 'Never'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="admin__action-row">
                                                    {pendingDelete ? (
                                                        <button className="admin__action-btn admin__action-btn--activate" onClick={() => handleRestore(u.id)} title="Restore account">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                                                            </svg>
                                                        </button>
                                                    ) : u.status === 'disabled' ? (
                                                        <button className="admin__action-btn admin__action-btn--activate" onClick={() => handleReactivate(u.id)} title="Reactivate">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <button className="admin__action-btn admin__action-btn--disable" onClick={() => handleDisable(u.id, u.name)} title="Disable user">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {!pendingDelete && (
                                                        <button className="admin__action-btn admin__action-btn--delete" onClick={() => handleDeleteAccount(u.id, u.name)} title="Delete account (auto-purges in 30 days)">
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
                                                                <path d="M10 11v6" />
                                                                <path d="M14 11v6" />
                                                                <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Notice History */}
            <div className="admin__section-header">
                <div>
                    <h2>Staff Notices</h2>
                    <p>Publish urgent popups and track staff acknowledgement.</p>
                </div>
                <button type="button" className="admin__invite-btn" onClick={() => setShowNoticeModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    New notice
                </button>
            </div>

            <div className="admin__table-card admin__notice-card">
                <div className="admin__table-scroll">
                    <table className="admin__table">
                        <thead>
                            <tr>
                                <th>Notice</th>
                                <th>Priority</th>
                                <th>Seen</th>
                                <th>Acknowledged</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {notices.length === 0 ? (
                                <tr>
                                    <td colSpan="6">
                                        <span className="admin__empty">No notices have been published yet.</span>
                                    </td>
                                </tr>
                            ) : notices.map((notice) => (
                                <tr key={notice.id}>
                                    <td>
                                        <span className="admin__user-name">{notice.title}</span>
                                        <span className="admin__user-email">
                                            From {notice.sender_name || notice.created_by_name || 'Frido Admin'} • {new Date(notice.created_at).toLocaleString()}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`admin__status admin__status--${notice.priority}`}>
                                            {notice.priority}
                                        </span>
                                    </td>
                                    <td>{notice.seen_count || 0}</td>
                                    <td>{notice.acknowledged_count || 0}</td>
                                    <td>
                                        <span className={`admin__status ${notice.active ? 'admin__status--active' : 'admin__status--disabled'}`}>
                                            {notice.active ? 'active' : 'inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin__action-row">
                                            <button
                                                className="admin__action-btn admin__action-btn--notice-toggle"
                                                onClick={() => handleNoticeStatus(notice.id, !notice.active)}
                                                title={notice.active ? 'Deactivate notice' : 'Reactivate notice'}
                                            >
                                                {notice.active ? 'Off' : 'On'}
                                            </button>
                                            <button
                                                className="admin__action-btn admin__action-btn--delete"
                                                onClick={() => handleDeleteNotice(notice.id, notice.title)}
                                                title="Delete notice permanently"
                                            >
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
                                                    <path d="M10 11v6" />
                                                    <path d="M14 11v6" />
                                                    <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Import users modal ── */}
            {showImportModal && (
                <div
                    className="admin__modal-overlay"
                    onClick={() => {
                        setShowImportModal(false);
                        setImportParsedRows([]);
                        setImportFileLabel('');
                        setImportParseError('');
                        setImportResultSummary('');
                    }}
                >
                    <div className="admin__modal admin__modal--wide" onClick={(e) => e.stopPropagation()}>
                        <div className="admin__modal-header">
                            <h2>Import users (CSV / Excel)</h2>
                            <button
                                type="button"
                                className="admin__modal-close"
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportParsedRows([]);
                                    setImportFileLabel('');
                                    setImportParseError('');
                                    setImportResultSummary('');
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="admin__modal-body">
                            <p className="admin__modal-desc">
                                Rows are saved to the roster immediately with status <strong>import pending</strong>. Then tick users in the
                                table and use <strong>Send invitation emails</strong> to create Clerk invitations and dispatch mail.
                                Required columns: <code>email</code>, <code>name</code>, <code>role</code>. Optional:{' '}
                                <code>department</code>, <code>store_name</code>.
                            </p>
                            <div className="admin__import-actions">
                                <button type="button" className="profile__btn profile__btn--ghost" onClick={downloadImportTemplate}>
                                    Download CSV template
                                </button>
                                <label className="admin__import-file-label">
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        className="admin__import-file-input"
                                        onChange={handleImportFile}
                                    />
                                    <span className="admin__invite-btn">Choose file</span>
                                </label>
                                {importFileLabel ? <span className="admin__import-file-name">{importFileLabel}</span> : null}
                            </div>
                            {importParseError ? <div className="admin__error admin__error--compact">{importParseError}</div> : null}
                            {importParsedRows.length > 0 ? (
                                <div className="admin__import-preview-wrap">
                                    <p className="admin__import-preview-meta">
                                        Preview ({importParsedRows.length} row{importParsedRows.length === 1 ? '' : 's'}, showing first{' '}
                                        {Math.min(15, importParsedRows.length)})
                                    </p>
                                    <div className="admin__table-scroll admin__import-preview-scroll">
                                        <table className="admin__table admin__table--compact">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>email</th>
                                                    <th>name</th>
                                                    <th>role</th>
                                                    <th>department</th>
                                                    <th>store_name</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importParsedRows.slice(0, 15).map((row, idx) => (
                                                    <tr key={idx}>
                                                        <td>{idx + 1}</td>
                                                        <td>{String(pickImportField(row, IMPORT_FIELD_KEYS.email))}</td>
                                                        <td>{String(pickImportField(row, IMPORT_FIELD_KEYS.name))}</td>
                                                        <td>{String(pickImportField(row, IMPORT_FIELD_KEYS.role))}</td>
                                                        <td>{String(pickImportField(row, IMPORT_FIELD_KEYS.department))}</td>
                                                        <td>{String(pickImportField(row, IMPORT_FIELD_KEYS.store_name))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}
                            {importResultSummary ? (
                                <div className="profile__message profile__message--success">{importResultSummary}</div>
                            ) : null}
                            <div className="admin__modal-actions">
                                <button
                                    type="button"
                                    className="profile__btn profile__btn--ghost"
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportParsedRows([]);
                                        setImportFileLabel('');
                                        setImportParseError('');
                                        setImportResultSummary('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="profile__btn profile__btn--primary"
                                    disabled={!importParsedRows.length || importSubmitLoading}
                                    onClick={() => handleImportConfirm()}
                                >
                                    {importSubmitLoading ? 'Importing…' : 'Import to roster'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Invite Modal ── */}
            {showInviteModal && (
                <div className="admin__modal-overlay" onClick={() => setShowInviteModal(false)}>
                    <div className="admin__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin__modal-header">
                            <h2>Invite Team Member</h2>
                            <button className="admin__modal-close" onClick={() => setShowInviteModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleInvite} className="admin__modal-body">
                            <p className="admin__modal-desc">
                                An invitation email will be sent through Microsoft Graph. The user must accept it and set a password before logging in.
                            </p>
                            <div className="admin__modal-field">
                                <label>Full Name</label>
                                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="e.g., John Doe" required />
                            </div>
                            <div className="admin__modal-field">
                                <label>Email Address</label>
                                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="e.g., john@myfrido.com" required />
                            </div>
                            <div className="admin__modal-field">
                                <label>Role</label>
                                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                                    <option value="staff">Staff — Staff dashboard only</option>
                                    <option value="feedback">Feedback Department Access — Feedback dashboard only</option>
                                    <option value="executive">Executive — ISD NM only</option>
                                    <option value="team_lead">Team Lead — ISD NM only</option>
                                    <option value="admin">Admin — Full access + user management</option>
                                </select>
                            </div>
                            {inviteRole === 'staff' && (
                                <div className="admin__modal-field">
                                    <label>Store Name</label>
                                    <input 
                                        type="text" 
                                        value={inviteStoreName} 
                                        onChange={(e) => setInviteStoreName(e.target.value)} 
                                        placeholder="e.g., Mumbai - Phoenix" 
                                        required 
                                    />
                                </div>
                            )}
                            {inviteMessage && (
                                <div className={`profile__message ${inviteMessage.includes('success') || inviteMessage.includes('copied') ? 'profile__message--success' : 'profile__message--error'}`}>
                                    {inviteMessage}
                                </div>
                            )}
                            {inviteWarning && (
                                <div className="admin__invite-warning">
                                    <strong>Heads up:</strong> {inviteWarning}
                                    {inviteLink && (
                                        <div className="admin__invite-link-row">
                                            <input
                                                type="text"
                                                readOnly
                                                value={inviteLink}
                                                onFocus={(e) => e.target.select()}
                                                className="admin__invite-link-input"
                                            />
                                            <button type="button" className="profile__btn profile__btn--ghost" onClick={copyInviteLink}>
                                                Copy link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="admin__modal-actions">
                                <button type="button" className="profile__btn profile__btn--ghost" onClick={() => { setShowInviteModal(false); setInviteWarning(''); setInviteLink(''); setInviteMessage(''); }}>
                                    {inviteWarning ? 'Close' : 'Cancel'}
                                </button>
                                {!inviteWarning && (
                                    <button type="submit" className="profile__btn profile__btn--primary" disabled={inviteLoading}>
                                        {inviteLoading ? 'Sending...' : 'Send Invitation'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Notice Modal ── */}
            {showNoticeModal && (
                <div className="admin__modal-overlay" onClick={() => setShowNoticeModal(false)}>
                    <div className="admin__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin__modal-header">
                            <h2>Send Staff Notice</h2>
                            <button className="admin__modal-close" onClick={() => setShowNoticeModal(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateNotice} className="admin__modal-body">
                            <p className="admin__modal-desc">
                                Staff will see active notices as popup messages after login and while using the dashboard.
                            </p>
                            <div className="admin__modal-field">
                                <label>From</label>
                                <input
                                    type="text"
                                    value={noticeSender}
                                    onChange={(e) => setNoticeSender(e.target.value)}
                                    placeholder="e.g., Ritwik M."
                                />
                            </div>
                            <div className="admin__modal-field">
                                <label>Title</label>
                                <input type="text" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="e.g., Update today reports before 6 PM" required />
                            </div>
                            <div className="admin__modal-field">
                                <label>Message</label>
                                <textarea value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} placeholder="Tell staff what they need to do..." required />
                            </div>
                            <div className="admin__modal-field">
                                <label>Priority</label>
                                <select value={noticePriority} onChange={(e) => setNoticePriority(e.target.value)}>
                                    <option value="normal">Normal</option>
                                    <option value="important">Important</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <label className="admin__checkbox">
                                <input type="checkbox" checked={noticeRequiresAck} onChange={(e) => setNoticeRequiresAck(e.target.checked)} />
                                <span>Require staff acknowledgement</span>
                            </label>
                            {noticeMessage && (
                                <div className={`profile__message ${noticeMessage.includes('success') ? 'profile__message--success' : 'profile__message--error'}`}>
                                    {noticeMessage}
                                </div>
                            )}
                            <div className="admin__modal-actions">
                                <button type="button" className="profile__btn profile__btn--ghost" onClick={() => setShowNoticeModal(false)}>Cancel</button>
                                <button type="submit" className="profile__btn profile__btn--primary" disabled={noticeLoading}>
                                    {noticeLoading ? 'Publishing...' : 'Publish Notice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
