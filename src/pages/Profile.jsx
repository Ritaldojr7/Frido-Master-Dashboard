import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
    const { user, updateProfile, changePassword } = useAuth();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [department, setDepartment] = useState(user?.department || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Password change
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);

    if (!user) return null;

    const initials = user.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const roleBadge = {
        admin: { label: 'Administrator', color: 'amber' },
        manager: { label: 'Manager', color: 'purple' },
        viewer: { label: 'Viewer', color: 'blue' },
    }[user.role] || { label: user.role, color: 'blue' };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await updateProfile({ name, department });
            setMessage('Profile updated successfully');
            setEditing(false);
        } catch (err) {
            setMessage(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordMessage('');

        if (newPassword !== confirmPassword) {
            setPasswordMessage('Passwords do not match');
            return;
        }
        if (newPassword.length < 4) {
            setPasswordMessage('Password must be at least 4 characters');
            return;
        }

        setPasswordSaving(true);
        try {
            await changePassword(currentPassword, newPassword);
            setPasswordMessage('Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setShowPasswordForm(false), 1500);
        } catch (err) {
            setPasswordMessage(err.message || 'Failed to change password');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleCancel = () => {
        setName(user.name);
        setDepartment(user.department || '');
        setEditing(false);
        setMessage('');
    };

    return (
        <div className="profile">
            <div className="profile__header">
                <h1 className="profile__page-title">My Profile</h1>
                <p className="profile__page-desc">Manage your account settings and preferences</p>
            </div>

            <div className="profile__grid">
                {/* ── Profile Card ── */}
                <div className="profile__card profile__card--main">
                    <div className="profile__card-header">
                        <div className="profile__avatar-section">
                            <div className="profile__avatar">
                                <span>{initials}</span>
                            </div>
                            <div>
                                <h2 className="profile__name">{user.name}</h2>
                                <span className="profile__email">{user.email}</span>
                            </div>
                        </div>
                        <span className={`profile__role-badge profile__role-badge--${roleBadge.color}`}>
                            {roleBadge.label}
                        </span>
                    </div>

                    <div className="profile__card-body">
                        <div className="profile__field-group">
                            <div className="profile__field">
                                <label className="profile__label">Full Name</label>
                                {editing ? (
                                    <input
                                        type="text"
                                        className="profile__input"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <p className="profile__value">{user.name}</p>
                                )}
                            </div>

                            <div className="profile__field">
                                <label className="profile__label">Email Address</label>
                                <p className="profile__value profile__value--muted">{user.email}</p>
                            </div>

                            <div className="profile__field">
                                <label className="profile__label">Department</label>
                                {editing ? (
                                    <input
                                        type="text"
                                        className="profile__input"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        placeholder="e.g., Sales, Technology"
                                    />
                                ) : (
                                    <p className="profile__value">
                                        {user.department || <span className="profile__value--muted">Not set</span>}
                                    </p>
                                )}
                            </div>

                            <div className="profile__field">
                                <label className="profile__label">Role</label>
                                <p className="profile__value">{roleBadge.label}</p>
                            </div>
                        </div>

                        {message && (
                            <div className={`profile__message ${message.includes('success') ? 'profile__message--success' : 'profile__message--error'}`}>
                                {message}
                            </div>
                        )}

                        <div className="profile__actions">
                            {editing ? (
                                <>
                                    <button className="profile__btn profile__btn--primary" onClick={handleSave} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button className="profile__btn profile__btn--ghost" onClick={handleCancel}>
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button className="profile__btn profile__btn--outline" onClick={() => setEditing(true)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Security Card ── */}
                <div className="profile__card">
                    <div className="profile__card-title-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <h3 className="profile__card-title">Security</h3>
                    </div>

                    {showPasswordForm ? (
                        <form onSubmit={handlePasswordChange} className="profile__password-form">
                            <div className="profile__field">
                                <label className="profile__label">Current Password</label>
                                <input type="password" className="profile__input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                            </div>
                            <div className="profile__field">
                                <label className="profile__label">New Password</label>
                                <input type="password" className="profile__input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                            </div>
                            <div className="profile__field">
                                <label className="profile__label">Confirm Password</label>
                                <input type="password" className="profile__input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            </div>
                            {passwordMessage && (
                                <div className={`profile__message ${passwordMessage.includes('success') ? 'profile__message--success' : 'profile__message--error'}`}>
                                    {passwordMessage}
                                </div>
                            )}
                            <div className="profile__actions">
                                <button type="submit" className="profile__btn profile__btn--primary" disabled={passwordSaving}>
                                    {passwordSaving ? 'Changing...' : 'Change Password'}
                                </button>
                                <button type="button" className="profile__btn profile__btn--ghost" onClick={() => { setShowPasswordForm(false); setPasswordMessage(''); }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile__security-item">
                            <div>
                                <p className="profile__security-title">Password</p>
                                <p className="profile__security-desc">Last updated: Unknown</p>
                            </div>
                            <button className="profile__btn profile__btn--outline profile__btn--sm" onClick={() => setShowPasswordForm(true)}>
                                Change
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Account Info Card ── */}
                <div className="profile__card">
                    <div className="profile__card-title-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <h3 className="profile__card-title">Account Info</h3>
                    </div>
                    <div className="profile__info-grid">
                        <div className="profile__info-item">
                            <span className="profile__info-label">Member since</span>
                            <span className="profile__info-value">
                                {user.created_at
                                    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="profile__info-item">
                            <span className="profile__info-label">Last login</span>
                            <span className="profile__info-value">
                                {user.last_login
                                    ? new Date(user.last_login).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
                                    : 'N/A'}
                            </span>
                        </div>
                        <div className="profile__info-item">
                            <span className="profile__info-label">Account status</span>
                            <span className="profile__info-value profile__info-value--active">Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
