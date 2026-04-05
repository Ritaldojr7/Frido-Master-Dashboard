import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './UserMenu.css';

export default function UserMenu() {
    const { user, logout, hasRole } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Close on click outside
    useEffect(() => {
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClick);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    // Close on Escape
    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    if (!user) return null;

    const initials = user.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const roleBadge = {
        admin: { label: 'Admin', className: 'user-menu__role--admin' },
        manager: { label: 'Manager', className: 'user-menu__role--manager' },
        viewer: { label: 'Viewer', className: 'user-menu__role--viewer' },
    }[user.role] || { label: user.role, className: '' };

    const handleNav = (path) => {
        setOpen(false);
        navigate(path);
    };

    return (
        <div className="user-menu" ref={menuRef}>
            <button
                className="user-menu__trigger"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                aria-haspopup="true"
                id="user-menu-trigger"
            >
                <div className="user-menu__avatar">
                    <span>{initials}</span>
                </div>
                <span className="user-menu__name">{user.name?.split(' ')[0]}</span>
                <svg className={`user-menu__chevron ${open ? 'user-menu__chevron--open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {open && (
                <div className="user-menu__dropdown" role="menu" aria-labelledby="user-menu-trigger">
                    {/* User Info */}
                    <div className="user-menu__info">
                        <div className="user-menu__avatar user-menu__avatar--lg">
                            <span>{initials}</span>
                        </div>
                        <div className="user-menu__details">
                            <span className="user-menu__fullname">{user.name}</span>
                            <span className="user-menu__email">{user.email}</span>
                            <span className={`user-menu__role ${roleBadge.className}`}>{roleBadge.label}</span>
                        </div>
                    </div>

                    <div className="user-menu__divider" />

                    {/* Nav Items */}
                    <button className="user-menu__item" onClick={() => handleNav('/profile')} role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Profile</span>
                    </button>

                    {hasRole('admin') && (
                        <button className="user-menu__item" onClick={() => handleNav('/admin')} role="menuitem">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                            </svg>
                            <span>User Management</span>
                        </button>
                    )}

                    <button className="user-menu__item" onClick={toggleTheme} role="menuitem">
                        {theme === 'dark' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                            </svg>
                        )}
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

                    <div className="user-menu__divider" />

                    <button className="user-menu__item user-menu__item--danger" onClick={() => { setOpen(false); logout(); }} role="menuitem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign Out</span>
                    </button>
                </div>
            )}
        </div>
    );
}
