import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import RoleMultiSelect from '../components/RoleMultiSelect/RoleMultiSelect';
import { ROLE_OPTIONS, ROLE_LABELS } from '../config/roleOptions';
import './Admin.css';

const USERS_PAGE_SIZE = 10;

export default function Admin() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'users';
    const [activeTab, setActiveTab] = useState(['users', 'requests', 'notices', 'notifications'].includes(initialTab) ? initialTab : 'users');

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['users', 'requests', 'notices', 'notifications'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    // Access Requests tab state
    const [requests, setRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState('');
    const [requestsMessage, setRequestsMessage] = useState('');

    // Notifications tab state
    const [notifList, setNotifList] = useState([]);
    const [notifTotal, setNotifTotal] = useState(0);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifError, setNotifError] = useState('');
    const [notifTypeFilter, setNotifTypeFilter] = useState('');
    const [notifSearch, setNotifSearch] = useState('');

    const fetchNotifications = useCallback(async () => {
        setNotifLoading(true);
        setNotifError('');
        try {
            const query = new URLSearchParams();
            query.set('limit', '100');
            if (notifTypeFilter) query.set('type', notifTypeFilter);
            if (notifSearch) query.set('search', notifSearch);

            const data = await apiFetch(`/api/notifications?${query.toString()}`);
            setNotifList(data.notifications || []);
            setNotifTotal(data.total || 0);
        } catch (err) {
            setNotifError(err.message || 'Failed to fetch notifications.');
        } finally {
            setNotifLoading(false);
        }
    }, [notifTypeFilter, notifSearch]);

    const [dedupLoading, setDedupLoading] = useState(false);
    const handleDeduplicateLogins = useCallback(async () => {
        if (!window.confirm('Remove duplicate login notifications? This keeps only one entry per user per 15-minute session.')) return;
        setDedupLoading(true);
        try {
            const data = await apiFetch('/api/notifications/deduplicate-logins', { method: 'POST' });
            alert(data.message || 'Done');
            fetchNotifications();
        } catch (err) {
            alert('Failed: ' + (err.message || 'Unknown error'));
        } finally {
            setDedupLoading(false);
        }
    }, [fetchNotifications]);

    const [clearAllLoading, setClearAllLoading] = useState(false);
    const handleClearAllNotifications = useCallback(async () => {
        if (!window.confirm('Delete all stored notifications permanently from the database?')) return;
        setClearAllLoading(true);
        try {
            const data = await apiFetch('/api/notifications/clear-all', { method: 'DELETE' });
            alert(data.message || 'All notifications cleared.');
            fetchNotifications();
        } catch (err) {
            alert('Failed to clear notifications: ' + (err.message || 'Unknown error'));
        } finally {
            setClearAllLoading(false);
        }
    }, [fetchNotifications]);

    useEffect(() => {
        if (activeTab === 'notifications') {
            fetchNotifications();
        }
    }, [activeTab, fetchNotifications]);

    // Roster Filters
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

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
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
    const [bulkDeleteMessage, setBulkDeleteMessage] = useState('');
    const [userTablePage, setUserTablePage] = useState(1);

    // Notice form
    const [notices, setNotices] = useState([]);
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeBody, setNoticeBody] = useState('');
    const [noticePriority, setNoticePriority] = useState('normal');
    const [noticeRequiresAck, setNoticeRequiresAck] = useState(true);
    const [noticeSender, setNoticeSender] = useState('');
    const [noticeLoading, setNoticeLoading] = useState(false);
    const [noticeMessage, setNoticeMessage] = useState('');
    const [noticeAudience, setNoticeAudience] = useState('retail_staff');
    const [editingNoticeId, setEditingNoticeId] = useState(null);
    const [noticePdfFiles, setNoticePdfFiles] = useState([]);
    const [noticeExistingAttachments, setNoticeExistingAttachments] = useState([]);
    const [noticeRemoveAttachmentIds, setNoticeRemoveAttachmentIds] = useState([]);
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

    const fetchRequests = useCallback(async () => {
        setRequestsLoading(true);
        setRequestsError('');
        try {
            const data = await apiFetch('/api/users/requests');
            setRequests(data.requests || []);
        } catch (err) {
            setRequestsError(err.message || 'Failed to fetch access requests.');
        } finally {
            setRequestsLoading(false);
        }
    }, []);

    const handleApproveRequest = async (id) => {
        setRequestsMessage('');
        try {
            const data = await apiFetch(`/api/users/requests/${id}/approve`, {
                method: 'POST',
            });
            setRequestsMessage(data.message || 'Request approved successfully!');
            fetchRequests();
            fetchUsers(); // Refresh the user list
            setTimeout(() => setRequestsMessage(''), 3000);
        } catch (err) {
            setRequestsError(err.message || 'Failed to approve request.');
        }
    };

    const handleRejectRequest = async (id) => {
        setRequestsMessage('');
        try {
            const data = await apiFetch(`/api/users/requests/${id}/reject`, {
                method: 'POST',
            });
            setRequestsMessage(data.message || 'Request rejected.');
            fetchRequests();
            setTimeout(() => setRequestsMessage(''), 3000);
        } catch (err) {
            setRequestsError(err.message || 'Failed to reject request.');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchNotices();
    }, [fetchUsers, fetchNotices]);

    useEffect(() => {
        if (activeTab === 'requests') {
            fetchRequests();
        }
    }, [activeTab, fetchRequests]);

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
                setInviteLink(data.inviteLink || '');
                setInviteEmail('');
                setInviteName('');
                setInviteRole('staff');
                setInviteStoreName('');
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

    const resetNoticeModal = () => {
        setEditingNoticeId(null);
        setNoticeTitle('');
        setNoticeBody('');
        setNoticePriority('normal');
        setNoticeRequiresAck(true);
        setNoticeAudience('retail_staff');
        setNoticeSender(user?.name || '');
        setNoticePdfFiles([]);
        setNoticeExistingAttachments([]);
        setNoticeRemoveAttachmentIds([]);
        setNoticeMessage('');
    };

    const openNoticeModalForCreate = () => {
        resetNoticeModal();
        setShowNoticeModal(true);
    };

    const openNoticeModalForEdit = (notice) => {
        setEditingNoticeId(notice.id);
        setNoticeTitle(notice.title || '');
        setNoticeBody(notice.body || '');
        setNoticePriority(notice.priority || 'normal');
        setNoticeRequiresAck(Boolean(notice.requires_ack));
        setNoticeAudience(notice.audience || 'retail_staff');
        setNoticeSender(notice.sender_name || notice.created_by_name || user?.name || '');
        setNoticeExistingAttachments(notice.attachments || []);
        setNoticeRemoveAttachmentIds([]);
        setNoticePdfFiles([]);
        setNoticeMessage('');
        setShowNoticeModal(true);
    };

    const buildNoticeFormData = () => {
        const fd = new FormData();
        fd.append('title', noticeTitle);
        fd.append('body', noticeBody);
        fd.append('priority', noticePriority);
        fd.append('requires_ack', noticeRequiresAck ? 'true' : 'false');
        fd.append('sent_by_name', noticeSender);
        fd.append('audience', noticeAudience);
        fd.append('active', 'true');
        if (editingNoticeId) {
            const keepIds = noticeExistingAttachments
                .map((a) => a.id)
                .filter((id) => !noticeRemoveAttachmentIds.includes(id));
            fd.append('keep_attachment_ids', JSON.stringify(keepIds));
        }
        for (const file of noticePdfFiles) {
            fd.append('pdfs', file);
        }
        return fd;
    };

    const handleSubmitNotice = async (e) => {
        e.preventDefault();
        setNoticeLoading(true);
        setNoticeMessage('');

        const keptCount =
            noticeExistingAttachments.filter((a) => !noticeRemoveAttachmentIds.includes(a.id)).length +
            noticePdfFiles.length;
        if (keptCount > 5) {
            setNoticeMessage('At most 5 attachments per notice');
            setNoticeLoading(false);
            return;
        }

        if (editingNoticeId) {
            const ok = confirm(
                'Save changes? Everyone in this audience will receive a new email and see the notice popup again.'
            );
            if (!ok) {
                setNoticeLoading(false);
                return;
            }
        }

        try {
            const url = editingNoticeId
                ? `/api/notices/admin/${editingNoticeId}`
                : '/api/notices/admin';
            const method = editingNoticeId ? 'PUT' : 'POST';
            await apiFetch(url, { method, body: buildNoticeFormData() });
            setNoticeMessage(editingNoticeId ? 'Notice updated successfully!' : 'Notice published successfully!');
            resetNoticeModal();
            fetchNotices();
            setTimeout(() => {
                setShowNoticeModal(false);
                setNoticeMessage('');
            }, 1200);
        } catch (err) {
            setNoticeMessage(err.message || 'Failed to save notice');
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

    const handleDeleteNotice = async (noticeId, noticeTitle, audience = 'retail_staff') => {
        const audLabel = audience === 'isd_nm' ? 'ISD NM' : 'retail staff';
        const ok = confirm(
            `Delete this notice permanently?\n\n` +
            `Title: ${noticeTitle}\n\n` +
            `This will remove it for ${audLabel} and delete acknowledgement history for this notice.`
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

    const handleRolesChange = async (userId, roles) => {
        try {
            await apiFetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ roles }),
            });
            fetchUsers();
            alert(
                `Roles updated to ${roles.join(', ')}. The user may need to log out and back in for navigation to refresh.`
            );
        } catch (err) {
            alert(err.message || 'Failed to update roles');
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
            `Remove ${userName} from the roster?\n\n` +
                `They disappear from this list immediately. The account is disabled and removed from the database after 30 days.`
        );
        if (!ok) return;
        try {
            await apiFetch(`/api/users/${userId}/permanent`, { method: 'DELETE' });
            fetchUsers();
        } catch (err) {
            alert(err.message || 'Failed to delete user');
        }
    };

    const openImportModal = () => {
        setShowImportModal(true);
        setImportParsedRows([]);
        setImportFileLabel('');
        setImportParseError('');
        setImportResultSummary('');
    };

    /** Users not yet scheduled for deletion — deleted rows disappear from this page after delete. */
    const listedUsers = useMemo(() => users.filter((u) => !u.deleted_at), [users]);

    const filteredUsers = useMemo(() => {
        return listedUsers.filter((u) => {
            const matchesRole = !filterRole || u.roles?.includes(filterRole) || u.role === filterRole;
            const matchesStatus = !filterStatus || u.status === filterStatus;
            return matchesRole && matchesStatus;
        });
    }, [listedUsers, filterRole, filterStatus]);

    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => {
            const aIsAdmin = a.roles?.includes('admin') || a.role === 'admin';
            const bIsAdmin = b.roles?.includes('admin') || b.role === 'admin';
            if (aIsAdmin && !bIsAdmin) return -1;
            if (!aIsAdmin && bIsAdmin) return 1;

            const aHasLogin = !!a.last_login;
            const bHasLogin = !!b.last_login;
            if (aHasLogin && !bHasLogin) return -1;
            if (!aHasLogin && bHasLogin) return 1;

            if (aHasLogin && bHasLogin) {
                return new Date(b.last_login) - new Date(a.last_login);
            }

            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
        });
    }, [filteredUsers]);

    const userTableTotalPages = useMemo(
        () => Math.max(1, Math.ceil(sortedUsers.length / USERS_PAGE_SIZE)),
        [sortedUsers.length]
    );

    useEffect(() => {
        setUserTablePage((p) => Math.min(p, userTableTotalPages));
    }, [sortedUsers.length, userTableTotalPages]);

    const pagedListedUsers = useMemo(() => {
        const indexOfLast = userTablePage * USERS_PAGE_SIZE;
        const indexOfFirst = indexOfLast - USERS_PAGE_SIZE;
        return sortedUsers.slice(indexOfFirst, indexOfLast);
    }, [sortedUsers, userTablePage]);

    const selectableUsers = useMemo(
        () => sortedUsers.filter((u) => u.id !== user?.id),
        [sortedUsers, user?.id]
    );
    const selectedCount = Object.keys(selectedIds).length;
    const selectedPendingCount = useMemo(
        () =>
            Object.keys(selectedIds).filter((id) =>
                sortedUsers.some((u) => u.id === id && u.status === 'import_pending')
            ).length,
        [selectedIds, sortedUsers]
    );

    const toggleSelectUser = (id) => {
        setSelectedIds((prev) => {
            const next = { ...prev };
            if (next[id]) delete next[id];
            else next[id] = true;
            return next;
        });
    };

    const toggleSelectAllSelectable = (checked) => {
        if (!checked) {
            setSelectedIds({});
            return;
        }
        const next = {};
        selectableUsers.forEach((u) => {
            next[u.id] = true;
        });
        setSelectedIds(next);
    };

    const allSelectableSelected =
        selectableUsers.length > 0 && selectableUsers.every((u) => Boolean(selectedIds[u.id]));

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
        const pendingIds = Object.keys(selectedIds).filter((id) =>
            users.some((u) => u.id === id && u.status === 'import_pending')
        );
        if (!pendingIds.length) {
            setBulkInviteMessage('No import-pending users in selection.');
            setTimeout(() => setBulkInviteMessage(''), 5000);
            return;
        }
        if (bulkInviteLoading) return;
        setBulkInviteLoading(true);
        setBulkInviteMessage('');
        try {
            const data = await apiFetch('/api/users/bulk-invite', {
                method: 'POST',
                body: JSON.stringify({ userIds: pendingIds }),
            });
            const results = data.results || [];
            const okCount = results.filter((r) => r.ok).length;
            const failCount = results.length - okCount;

            const nextSel = { ...selectedIds };
            results.forEach((r, i) => {
                const sentId = pendingIds[i];
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

    const handleBulkDelete = async () => {
        const ids = Object.keys(selectedIds);
        if (!ids.length || bulkDeleteLoading) return;
        const preview = ids
            .map((id) => {
                const u = users.find((x) => x.id === id);
                return u ? String(u.name || u.email || id) : id;
            })
            .slice(0, 5)
            .join(', ');
        const more = ids.length > 5 ? ` and ${ids.length - 5} more` : '';
        const ok = confirm(
            `Schedule ${ids.length} account(s) for deletion (purged after 30 days)?\n\n${preview}${more}\n\n` +
                `Same as the row trash action: accounts lock immediately and rows leave this list.`
        );
        if (!ok) return;
        setBulkDeleteLoading(true);
        setBulkDeleteMessage('');
        try {
            const data = await apiFetch('/api/users/bulk-delete', {
                method: 'POST',
                body: JSON.stringify({ userIds: ids }),
            });
            const results = data.results || [];
            const okCount = results.filter((r) => r.ok).length;

            const nextSel = { ...selectedIds };
            results.forEach((r) => {
                if (r?.ok && r.id) delete nextSel[r.id];
            });
            setSelectedIds(nextSel);

            const fails = results.filter((r) => !r.ok);
            let msg = `Scheduled ${okCount} account(s) for deletion.`;
            if (fails.length) {
                msg += ` ${fails.length} skipped (${fails
                    .slice(0, 3)
                    .map((f) => f.error || 'error')
                    .join('; ')}${fails.length > 3 ? '…' : ''}).`;
            }
            setBulkDeleteMessage(msg);
            await fetchUsers();
            setTimeout(() => setBulkDeleteMessage(''), 8000);
        } catch (err) {
            setBulkDeleteMessage(err.message || 'Bulk delete failed');
        } finally {
            setBulkDeleteLoading(false);
        }
    };

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
                {activeTab === 'users' && (
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
                )}
            </div>

            {/* Tab navigation */}
            <div className="admin__tabs">
                <button
                    type="button"
                    className={`admin__tab ${activeTab === 'users' ? 'admin__tab--active' : ''}`}
                    onClick={() => { setActiveTab('users'); setSearchParams({ tab: 'users' }); }}
                >
                    Team Roster
                </button>
                <button
                    type="button"
                    className={`admin__tab ${activeTab === 'requests' ? 'admin__tab--active' : ''}`}
                    onClick={() => { setActiveTab('requests'); setSearchParams({ tab: 'requests' }); }}
                >
                    Access Requests
                </button>
                <button
                    type="button"
                    className={`admin__tab ${activeTab === 'notices' ? 'admin__tab--active' : ''}`}
                    onClick={() => { setActiveTab('notices'); setSearchParams({ tab: 'notices' }); }}
                >
                    Staff Notices
                </button>
                <button
                    type="button"
                    className={`admin__tab ${activeTab === 'notifications' ? 'admin__tab--active' : ''}`}
                    onClick={() => { setActiveTab('notifications'); setSearchParams({ tab: 'notifications' }); }}
                >
                    Notifications
                </button>
            </div>

            {/* Error */}
            {error && <div className="admin__error">{error}</div>}

            {activeTab === 'users' && (
                <>
                    {/* Stats */}
                    <div className="admin__stats">
                        <div className="admin__stat">
                            <span className="admin__stat-number">{listedUsers.length}</span>
                            <span className="admin__stat-label">Total Users</span>
                        </div>
                        <div className="admin__stat">
                            <span className="admin__stat-number">{listedUsers.filter((u) => u.status === 'active').length}</span>
                            <span className="admin__stat-label">Active</span>
                        </div>
                        <div className="admin__stat">
                            <span className="admin__stat-number">{listedUsers.filter((u) => u.role === 'admin').length}</span>
                            <span className="admin__stat-label">Admins</span>
                        </div>
                        <div className="admin__stat">
                            <span className="admin__stat-number">{listedUsers.filter((u) => u.status === 'invited' || u.status === 'import_pending').length}</span>
                            <span className="admin__stat-label">Pending</span>
                        </div>
                    </div>

                    {(selectedCount > 0 || bulkInviteMessage || bulkDeleteMessage) && (
                        <div className="admin__bulk-bar">
                            {selectedCount > 0 ? (
                                <>
                                    <span className="admin__bulk-bar-text">{selectedCount} selected</span>
                                    <button
                                        type="button"
                                        className="admin__bulk-bar-btn admin__bulk-bar-btn--primary"
                                        disabled={
                                            bulkInviteLoading || bulkDeleteLoading || selectedPendingCount === 0
                                        }
                                        title={
                                            selectedPendingCount === 0
                                                ? 'Select at least one user with status “Import pending”'
                                                : undefined
                                        }
                                        onClick={() => handleBulkInvite()}
                                    >
                                        {bulkInviteLoading ? 'Sending…' : 'Send invitation emails'}
                                    </button>
                                    <button
                                        type="button"
                                        className="admin__bulk-bar-btn admin__bulk-bar-btn--danger"
                                        disabled={bulkDeleteLoading || bulkInviteLoading}
                                        onClick={() => handleBulkDelete()}
                                    >
                                        {bulkDeleteLoading ? 'Deleting…' : 'Mass delete selected'}
                                    </button>
                                    <button
                                        type="button"
                                        className="admin__bulk-bar-btn"
                                        disabled={bulkInviteLoading || bulkDeleteLoading}
                                        onClick={() => setSelectedIds({})}
                                    >
                                        Clear selection
                                    </button>
                                </>
                            ) : null}
                            {bulkInviteMessage ? (
                                <span className="admin__bulk-bar-msg">{bulkInviteMessage}</span>
                            ) : null}
                            {bulkDeleteMessage ? (
                                <span className="admin__bulk-bar-msg">{bulkDeleteMessage}</span>
                            ) : null}
                        </div>
                    )}

                    {/* Filters Bar */}
                    <div className="admin__filters">
                        <div className="admin__filter-item">
                            <span className="admin__filter-label">Role</span>
                            <div className="admin__filter-select-wrapper">
                                <select
                                    value={filterRole}
                                    onChange={(e) => {
                                        setFilterRole(e.target.value);
                                        setUserTablePage(1);
                                    }}
                                    className="admin__filter-select"
                                >
                                    <option value="">All Roles</option>
                                    {ROLE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <svg className="admin__filter-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>

                        <div className="admin__filter-item">
                            <span className="admin__filter-label">Status</span>
                            <div className="admin__filter-select-wrapper">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => {
                                        setFilterStatus(e.target.value);
                                        setUserTablePage(1);
                                    }}
                                    className="admin__filter-select"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="invited">Invited</option>
                                    <option value="import_pending">Import pending</option>
                                    <option value="disabled">Disabled</option>
                                </select>
                                <svg className="admin__filter-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                        </div>
                    </div>

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
                                                    checked={allSelectableSelected}
                                                    disabled={selectableUsers.length === 0}
                                                    title="Select all users on the roster (all pages)"
                                                    onChange={(e) => toggleSelectAllSelectable(e.target.checked)}
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
                                        {sortedUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7}>
                                                    <span className="admin__empty">
                                                        {listedUsers.length === 0 
                                                            ? "No users on the roster." 
                                                            : "No users match the selected filters."}
                                                    </span>
                                                </td>
                                            </tr>
                                        ) : (
                                            pagedListedUsers.map((u) => {
                                            const nameStr = String(u.name || '').trim();
                                            const userInitials = nameStr
                                                ? nameStr.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                                                : '–';
                                            const avatarSrc = typeof u.avatar_url === 'string' ? u.avatar_url.trim() : '';
                                            return (
                                                <tr key={u.id} className={u.deleted_at ? 'admin__tr-pending-delete' : ''}>
                                                    <td className="admin__td-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            className="admin__row-checkbox"
                                                            checked={Boolean(selectedIds[u.id])}
                                                            onChange={() => toggleSelectUser(u.id)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <div className="admin__user-cell">
                                                            <div className="admin__user-avatar">
                                                                {avatarSrc ? (
                                                                    <img src={avatarSrc} alt="" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    <span>{userInitials}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="admin__user-name-row">
                                                                    <span className="admin__user-name">{u.name}</span>
                                                                </div>
                                                                <span className="admin__user-email">{u.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <RoleMultiSelect
                                                            value={u.roles ?? [u.role]}
                                                            disabled={u.id === user.id || u.status === 'disabled'}
                                                            onChange={(roles) => handleRolesChange(u.id, roles)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <span className={`admin__status ${statusClass(u.status)}`}>
                                                            {formatStatusLabel(u.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span className="admin__dept">{u.department || '—'}</span>
                                                            {u.designation && <span className="admin__designation" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{u.designation}</span>}
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
                                                            {u.status === 'invited' && (
                                                                <button 
                                                                    className="admin__action-btn admin__action-btn--invite" 
                                                                    onClick={() => {
                                                                        setInviteName(u.name || '');
                                                                        setInviteEmail(u.email || '');
                                                                        setInviteRole(u.role || 'staff');
                                                                        setInviteStoreName(u.store_name || '');
                                                                        setInviteWarning('');
                                                                        setInviteLink('');
                                                                        setInviteMessage('');
                                                                        setShowInviteModal(true);
                                                                    }} 
                                                                    title="Resend invitation / Copy direct link"
                                                                >
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                                        <polyline points="22,6 12,13 2,6" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            {u.status === 'disabled' ? (
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
                                                            <button className="admin__action-btn admin__action-btn--delete" onClick={() => handleDeleteAccount(u.id, u.name)} title="Delete account (removed from this list; purged from DB after 30 days)">
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
                                            );
                                        })
                                        )}
                                    </tbody>
                                </table>
                                {listedUsers.length > 0 ? (
                                    <div className="pagination">
                                        {Array.from({ length: userTableTotalPages }, (_, i) => i + 1).map((page) => (
                                            <button
                                                key={page}
                                                type="button"
                                                className={`pagination__btn ${userTablePage === page ? 'pagination__btn--active' : ''}`}
                                                onClick={() => setUserTablePage(page)}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Access Requests Tab */}
            {activeTab === 'requests' && (
                <div className="admin__table-card">
                    {requestsLoading ? (
                        <div className="admin__loading">Loading access requests...</div>
                    ) : requestsError ? (
                        <div className="admin__error">{requestsError}</div>
                    ) : (
                        <>
                            {requestsMessage && <div className="admin__success" style={{ margin: '16px', padding: '10px 14px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>{requestsMessage}</div>}
                            <div className="admin__table-scroll">
                                <table className="admin__table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Designation</th>
                                            <th>Department</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Reviewed By</th>
                                            <th>Submitted At</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.length === 0 ? (
                                            <tr>
                                                <td colSpan={9}>
                                                    <span className="admin__empty">No access requests found.</span>
                                                </td>
                                            </tr>
                                        ) : (
                                            requests.map((req) => (
                                                <tr key={req.id}>
                                                    <td><strong>{req.name}</strong></td>
                                                    <td>{req.email}</td>
                                                    <td>{req.designation}</td>
                                                    <td>{req.department}</td>
                                                    <td>
                                                        <span className="user-menu__role" style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: req.role === 'executive' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', color: req.role === 'executive' ? '#f59e0b' : '#3b82f6', border: '1px solid currentColor' }}>
                                                             {ROLE_LABELS[req.role] || req.role}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`admin__status admin__status--${req.status}`} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', textTransform: 'capitalize', background: req.status === 'approved' ? 'rgba(16,185,129,0.1)' : req.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b', border: '1px solid currentColor' }}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td>{req.reviewed_by ? req.reviewed_by : '—'}</td>
                                                    <td>{new Date(req.created_at).toLocaleDateString()}</td>
                                                    <td>
                                                        {req.status === 'pending' ? (
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    type="button"
                                                                    className="admin__req-btn admin__req-btn--approve"
                                                                    onClick={() => handleApproveRequest(req.id)}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin__req-btn admin__req-btn--reject"
                                                                    onClick={() => handleRejectRequest(req.id)}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Reviewed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Notices Tab */}
            {activeTab === 'notices' && (
                <>
                    {/* Notice History */}
                    <div className="admin__section-header">
                        <div>
                            <h2>Staff notices</h2>
                            <p>Publish popups for retail staff or ISD NM (executives &amp; team leads). Email copies go to that audience.</p>
                        </div>
                        <button type="button" className="admin__invite-btn" onClick={openNoticeModalForCreate}>
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
                                        <th>Audience</th>
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
                                            <td colSpan="7">
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
                                                <span className={`admin__status ${notice.audience === 'isd_nm' ? 'admin__status--invited' : 'admin__status--normal'}`}>
                                                    {notice.audience === 'isd_nm' ? 'ISD NM' : 'Retail staff'}
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
                                                        type="button"
                                                        className="admin__action-btn"
                                                        onClick={() => openNoticeModalForEdit(notice)}
                                                        title="Edit notice (re-sends email and popup)"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="admin__action-btn admin__action-btn--notice-toggle"
                                                        onClick={() => handleNoticeStatus(notice.id, !notice.active)}
                                                        title={notice.active ? 'Deactivate notice' : 'Reactivate notice'}
                                                    >
                                                        {notice.active ? 'Off' : 'On'}
                                                    </button>
                                                    <button
                                                        className="admin__action-btn admin__action-btn--delete"
                                                        onClick={() => handleDeleteNotice(notice.id, notice.title, notice.audience)}
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
                </>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="admin__section">
                    <div className="admin__section-header">
                        <div>
                            <h2>Admin Activity Notifications</h2>
                            <p>Universal audit log tracking dashboard uploads, user access requests, and logins.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                type="button"
                                className="admin__invite-btn"
                                style={{ background: '#f8d7da', color: '#842029', borderColor: '#f5c2c7' }}
                                onClick={handleClearAllNotifications}
                                disabled={clearAllLoading}
                            >
                                {clearAllLoading ? 'Clearing…' : '🗑️ Clear All'}
                            </button>
                            <button
                                type="button"
                                className="admin__invite-btn"
                                style={{ background: '#fff3cd', color: '#856404', borderColor: '#ffc107' }}
                                onClick={handleDeduplicateLogins}
                                disabled={dedupLoading}
                            >
                                {dedupLoading ? 'Cleaning…' : '🧹 Clean Up Duplicates'}
                            </button>
                            <button
                                type="button"
                                className="admin__invite-btn"
                                onClick={fetchNotifications}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <path d="M23 4v6h-6M1 20v-6h6" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                                Refresh Log
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="admin__notif-filters" style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className={`admin__notif-pill ${notifTypeFilter === '' ? 'admin__notif-pill--active' : ''}`}
                                onClick={() => setNotifTypeFilter('')}
                            >
                                All ({notifTotal})
                            </button>
                            <button
                                type="button"
                                className={`admin__notif-pill ${notifTypeFilter === 'upload' ? 'admin__notif-pill--active' : ''}`}
                                onClick={() => setNotifTypeFilter('upload')}
                            >
                                📤 Uploads
                            </button>
                            <button
                                type="button"
                                className={`admin__notif-pill ${notifTypeFilter === 'access_request' ? 'admin__notif-pill--active' : ''}`}
                                onClick={() => setNotifTypeFilter('access_request')}
                            >
                                🔑 Access Requests
                            </button>
                            <button
                                type="button"
                                className={`admin__notif-pill ${notifTypeFilter === 'user_login' ? 'admin__notif-pill--active' : ''}`}
                                onClick={() => setNotifTypeFilter('user_login')}
                            >
                                👤 User Logins
                            </button>
                        </div>

                        <div style={{ flex: 1, minWidth: '220px' }}>
                            <input
                                type="text"
                                className="admin__filter-select"
                                placeholder="Search notifications by title, message, or user email..."
                                value={notifSearch}
                                onChange={(e) => setNotifSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="admin__table-card">
                        {notifLoading ? (
                            <div className="admin__loading">Loading notification audit log...</div>
                        ) : notifError ? (
                            <div className="admin__error">{notifError}</div>
                        ) : (
                            <div className="admin__table-scroll">
                                <table className="admin__table">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Title</th>
                                            <th>Message</th>
                                            <th>Actor</th>
                                            <th>Date & Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notifList.length === 0 ? (
                                            <tr>
                                                <td colSpan={5}>
                                                    <span className="admin__empty">No notifications found.</span>
                                                </td>
                                            </tr>
                                        ) : (
                                            notifList.map((n) => (
                                                <tr key={n.id}>
                                                    <td>
                                                        <span className={`admin__notif-badge admin__notif-badge--${n.type}`}>
                                                            {n.type === 'upload'
                                                                ? '📤 Upload'
                                                                : n.type === 'access_request'
                                                                  ? '🔑 Access Request'
                                                                  : n.type === 'user_login'
                                                                    ? '👤 User Login'
                                                                    : '🔔 Notification'}
                                                        </span>
                                                    </td>
                                                    <td><strong>{n.title}</strong></td>
                                                    <td>{n.message}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            {n.actor_name && <strong style={{ fontSize: '13px' }}>{n.actor_name}</strong>}
                                                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{n.actor_email || 'System'}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                        {new Date(n.created_at).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                table and use <strong>Send invitation emails</strong> or <strong>Mass delete selected</strong> as needed.
                                Required columns: <code>email</code>, <code>name</code>, <code>role</code> (comma-separated
                                for multiple, e.g. <code>staff, feedback</code>). Optional:{' '}
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
                                    <option value="feedback_head">Feedback Head — Feedback department</option>
                                    <option value="executive">Executive — ISD NM only</option>
                                    <option value="team_lead">Team Lead — ISD NM only</option>
                                    <option value="orm_lead">ORM Lead — ORM dashboard only</option>
                                    <option value="td_head">T&D Head — LMS & Training</option>
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
                            {inviteLink && (
                                <div className="admin__invite-warning" style={{ borderLeftColor: inviteWarning ? 'var(--warning-border, #eab308)' : '#22c55e' }}>
                                    {inviteWarning ? (
                                        <><strong>Heads up:</strong> {inviteWarning}</>
                                    ) : (
                                        <><strong>Direct Invitation Link:</strong> If the user does not receive the automated email, they can sign up directly using this link:</>
                                    )}
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
                                </div>
                            )}
                            <div className="admin__modal-actions">
                                <button type="button" className="profile__btn profile__btn--ghost" onClick={() => { setShowInviteModal(false); setInviteWarning(''); setInviteLink(''); setInviteMessage(''); }}>
                                    {inviteWarning || inviteLink ? 'Close' : 'Cancel'}
                                </button>
                                {!(inviteWarning || inviteLink) && (
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
                <div
                    className="admin__modal-overlay"
                    onClick={() => {
                        setShowNoticeModal(false);
                        resetNoticeModal();
                    }}
                >
                    <div className="admin__modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin__modal-header">
                            <h2>{editingNoticeId ? 'Edit notice' : 'Send Staff Notice'}</h2>
                            <button
                                type="button"
                                className="admin__modal-close"
                                onClick={() => {
                                    setShowNoticeModal(false);
                                    resetNoticeModal();
                                }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmitNotice} className="admin__modal-body">
                            <p className="admin__modal-desc">
                                The selected audience sees this as a popup after login. A copy is emailed to active users in that audience (same Graph setup as invites). Retail staff = store staff; ISD NM = executives &amp; team leads only.
                                {editingNoticeId ? (
                                    <>
                                        {' '}
                                        <strong>Saving will re-email everyone and show the popup again.</strong>
                                    </>
                                ) : null}
                            </p>
                            <div className="admin__modal-field">
                                <label>Audience</label>
                                <select value={noticeAudience} onChange={(e) => setNoticeAudience(e.target.value)}>
                                    <option value="retail_staff">Retail staff</option>
                                    <option value="isd_nm">ISD NM (executives &amp; team leads)</option>
                                </select>
                            </div>
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
                            {editingNoticeId && noticeExistingAttachments.length > 0 ? (
                                <div className="admin__modal-field">
                                    <label>Existing attachments</label>
                                    <ul className="admin__notice-pdf-list">
                                        {noticeExistingAttachments.map((att) => (
                                            <li key={att.id}>
                                                <label className="admin__checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={!noticeRemoveAttachmentIds.includes(att.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setNoticeRemoveAttachmentIds((prev) =>
                                                                    prev.filter((id) => id !== att.id)
                                                                );
                                                            } else {
                                                                setNoticeRemoveAttachmentIds((prev) => [
                                                                    ...prev,
                                                                    att.id,
                                                                ]);
                                                            }
                                                        }}
                                                    />
                                                    <span>{att.file_name}</span>
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="admin__modal-hint">Uncheck to remove a file when you save.</p>
                                </div>
                            ) : null}
                            <div className="admin__modal-field">
                                <label>Attachments (PDF, PNG, JPEG — optional, max 5 total, 3 MB each)</label>
                                <input
                                    type="file"
                                    accept="application/pdf,.pdf,image/png,.png,image/jpeg,.jpg,.jpeg"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        setNoticePdfFiles(files.slice(0, 5));
                                        e.target.value = '';
                                    }}
                                />
                                {noticePdfFiles.length > 0 ? (
                                    <ul className="admin__notice-pdf-list">
                                        {noticePdfFiles.map((f, i) => (
                                            <li key={`${f.name}-${i}`}>{f.name}</li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                            {noticeMessage && (
                                <div className={`profile__message ${noticeMessage.includes('success') ? 'profile__message--success' : 'profile__message--error'}`}>
                                    {noticeMessage}
                                </div>
                            )}
                            <div className="admin__modal-actions">
                                <button
                                    type="button"
                                    className="profile__btn profile__btn--ghost"
                                    onClick={() => {
                                        setShowNoticeModal(false);
                                        resetNoticeModal();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="profile__btn profile__btn--primary" disabled={noticeLoading}>
                                    {noticeLoading
                                        ? 'Saving...'
                                        : editingNoticeId
                                          ? 'Save & notify audience'
                                          : 'Publish Notice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
