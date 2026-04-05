import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../context/AuthContext';
import './Admin.css';

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Invite form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState('viewer');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMessage, setInviteMessage] = useState('');

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

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteLoading(true);
        setInviteMessage('');

        try {
            await apiFetch('/api/users/invite', {
                method: 'POST',
                body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
            });
            setInviteMessage('Invitation sent successfully!');
            setInviteEmail('');
            setInviteName('');
            setInviteRole('viewer');
            fetchUsers();
            setTimeout(() => { setShowInviteModal(false); setInviteMessage(''); }, 1500);
        } catch (err) {
            setInviteMessage(err.message || 'Failed to send invitation');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await apiFetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole }),
            });
            fetchUsers();
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

    const roleBadgeClass = (role) => ({
        admin: 'admin__badge--amber',
        manager: 'admin__badge--purple',
        viewer: 'admin__badge--blue',
    }[role] || '');

    const statusClass = (status) => ({
        active: 'admin__status--active',
        invited: 'admin__status--invited',
        disabled: 'admin__status--disabled',
    }[status] || '');

    return (
        <div className="admin">
            <div className="admin__header">
                <div>
                    <h1 className="admin__title">User Management</h1>
                    <p className="admin__subtitle">Manage team members, roles, and access permissions</p>
                </div>
                <button className="admin__invite-btn" onClick={() => setShowInviteModal(true)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    Invite User
                </button>
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
                    <span className="admin__stat-number">{users.filter(u => u.status === 'invited').length}</span>
                    <span className="admin__stat-label">Pending</span>
                </div>
            </div>

            {/* Error */}
            {error && <div className="admin__error">{error}</div>}

            {/* Users Table */}
            <div className="admin__table-card">
                {loading ? (
                    <div className="admin__loading">Loading users...</div>
                ) : (
                    <div className="admin__table-scroll">
                        <table className="admin__table">
                            <thead>
                                <tr>
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
                                    const userInitials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                    return (
                                        <tr key={u.id} className={u.status === 'disabled' ? 'admin__row--disabled' : ''}>
                                            <td>
                                                <div className="admin__user-cell">
                                                    <div className="admin__user-avatar">
                                                        <span>{userInitials}</span>
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
                                                    disabled={u.status === 'disabled'}
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                            </td>
                                            <td>
                                                <span className={`admin__status ${statusClass(u.status)}`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="admin__dept">{u.department || '—'}</span>
                                            </td>
                                            <td>
                                                <span className="admin__date">
                                                    {u.last_login
                                                        ? new Date(u.last_login).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                        : 'Never'}
                                                </span>
                                            </td>
                                            <td>
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
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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
                                An invitation email with login credentials will be sent via Azure.
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
                                    <option value="viewer">Viewer — Dashboard home only</option>
                                    <option value="manager">Manager — All dashboard pages</option>
                                    <option value="admin">Admin — Full access + user management</option>
                                </select>
                            </div>
                            {inviteMessage && (
                                <div className={`profile__message ${inviteMessage.includes('success') ? 'profile__message--success' : 'profile__message--error'}`}>
                                    {inviteMessage}
                                </div>
                            )}
                            <div className="admin__modal-actions">
                                <button type="button" className="profile__btn profile__btn--ghost" onClick={() => setShowInviteModal(false)}>Cancel</button>
                                <button type="submit" className="profile__btn profile__btn--primary" disabled={inviteLoading}>
                                    {inviteLoading ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
