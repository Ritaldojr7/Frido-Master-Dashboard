import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../context/AuthContext';
import './NotificationBell.css';

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}

function getNotificationIcon(type) {
    switch (type) {
        case 'upload':
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="notif-icon notif-icon--upload">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
            );
        case 'access_request':
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="notif-icon notif-icon--request">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
            );
        case 'user_login':
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="notif-icon notif-icon--login">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="notif-icon">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            );
    }
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/api/notifications/summary');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.recent || []);
                setTotal(data.total || 0);
                // Calculate unread count (recent within last 24h)
                const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                const recentCount = (data.recent || []).filter(n => new Date(n.created_at).getTime() > oneDayAgo).length;
                setUnreadCount(recentCount);
            }
        } catch (err) {
            console.error('[NotificationBell] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(fetchSummary, 60000); // Poll every 60s
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleViewAll = () => {
        setOpen(false);
        navigate('/admin?tab=notifications');
    };

    return (
        <div className="notif-bell" ref={dropdownRef}>
            <button
                type="button"
                className={`notif-bell__btn ${open ? 'notif-bell__btn--active' : ''}`}
                aria-label="Admin Notifications"
                onClick={() => setOpen((prev) => !prev)}
                title="Universal Admin Notifications"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="notif-bell__icon">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notif-bell__badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="notif-dropdown">
                    <div className="notif-dropdown__header">
                        <div>
                            <h4 className="notif-dropdown__title">Admin Notifications</h4>
                            <span className="notif-dropdown__subtitle">{total} total logged events</span>
                        </div>
                        <button
                            type="button"
                            className="notif-dropdown__refresh-btn"
                            onClick={fetchSummary}
                            title="Refresh notifications"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                        </button>
                    </div>

                    <div className="notif-dropdown__body">
                        {loading && notifications.length === 0 ? (
                            <div className="notif-dropdown__empty">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                            <div className="notif-dropdown__empty">No recent notifications</div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} className="notif-item">
                                    <div className="notif-item__icon-wrapper">
                                        {getNotificationIcon(n.type)}
                                    </div>
                                    <div className="notif-item__content">
                                        <div className="notif-item__title">{n.title}</div>
                                        <div className="notif-item__message">{n.message}</div>
                                        <div className="notif-item__meta">
                                            <span className="notif-item__actor">{n.actor_name || n.actor_email || 'System'}</span>
                                            <span className="notif-item__time">{formatRelativeTime(n.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="notif-dropdown__footer">
                        <button
                            type="button"
                            className="notif-dropdown__view-all-btn"
                            onClick={handleViewAll}
                        >
                            View All in Admin Panel &rarr;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
