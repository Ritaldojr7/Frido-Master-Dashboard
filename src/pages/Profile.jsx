import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserButton, useUser } from '@clerk/react';
import './Profile.css';

export default function Profile() {
    const { user, updateProfile } = useAuth();
    const { user: clerkUser } = useUser();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [department, setDepartment] = useState(user?.department || '');
    const [storeName, setStoreName] = useState(user?.store_name || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const fileInputRef = useRef(null);

    if (!user) return null;

    const initials = user.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const roleBadge = {
        admin: { label: 'Administrator', color: 'amber' },
        manager: { label: 'Manager', color: 'purple' },
        staff: { label: 'Staff', color: 'blue' },
        viewer: { label: 'Viewer', color: 'blue' },
        feedback: { label: 'Feedback Department', color: 'emerald' },
    }[user.role] || { label: user.role, color: 'blue' };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            await updateProfile({ name, department, store_name: storeName });
            setMessage('Profile updated successfully');
            setEditing(false);
        } catch (err) {
            setMessage(err.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setName(user.name);
        setDepartment(user.department || '');
        setStoreName(user.store_name || '');
        setEditing(false);
        setMessage('');
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        setMessage('');
        try {
            await clerkUser.setProfileImage({ file });
            if (typeof clerkUser.reload === 'function') {
                await clerkUser.reload();
            }
            setMessage('Profile photo updated successfully');
        } catch (err) {
            setMessage(err.message || 'Failed to update photo');
        } finally {
            setSaving(false);
            e.target.value = '';
        }
    };

    const handlePhotoRemove = async () => {
        if (!confirm('Remove your profile photo? It will also clear from the user directory for admins.')) return;
        setSaving(true);
        setMessage('');
        try {
            await clerkUser.setProfileImage({ file: null });
            if (typeof clerkUser.reload === 'function') {
                await clerkUser.reload();
            }
            setMessage('Profile photo removed');
        } catch (err) {
            setMessage(err.message || 'Failed to remove photo');
        } finally {
            setSaving(false);
        }
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
                            <div className="profile__avatar-column">
                                <div className="profile__avatar">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="" />
                                    ) : (
                                        <span>{initials}</span>
                                    )}
                                    <button 
                                        type="button"
                                        className="profile__avatar-upload" 
                                        onClick={handlePhotoClick}
                                        title="Change Photo"
                                        disabled={saving}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handlePhotoChange} 
                                        accept="image/*" 
                                        style={{ display: 'none' }} 
                                    />
                                </div>
                                {Boolean(clerkUser?.imageUrl && String(clerkUser.imageUrl).trim()) && (
                                    <button
                                        type="button"
                                        className="profile__avatar-remove"
                                        onClick={handlePhotoRemove}
                                        disabled={saving}
                                    >
                                        Remove photo
                                    </button>
                                )}
                            </div>
                            <div className="profile__avatar-meta">
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

                            {user.role === 'staff' && (
                                <div className="profile__field">
                                    <label className="profile__label">Store Name</label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            className="profile__input"
                                            value={storeName}
                                            onChange={(e) => setStoreName(e.target.value)}
                                            placeholder="e.g., Mumbai - Phoenix"
                                        />
                                    ) : (
                                        <p className="profile__value">
                                            {user.store_name || <span className="profile__value--muted">Not set</span>}
                                        </p>
                                    )}
                                </div>
                            )}
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
                    <div className="profile__security-item">
                        <div>
                            <p className="profile__security-title">Account Security</p>
                            <p className="profile__security-desc">Manage your password, two-factor authentication, and security settings through Clerk.</p>
                        </div>
                        <UserButton
                            appearance={{
                                elements: {
                                    userButtonTrigger: {
                                        padding: '8px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-hover)',
                                        background: 'transparent',
                                        fontSize: '13px',
                                    }
                                }
                            }}
                        />
                    </div>
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
                            <span className="profile__info-label">Account status</span>
                            <span className="profile__info-value profile__info-value--active">Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
