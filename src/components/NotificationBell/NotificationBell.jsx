import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../context/AuthContext';
import './NotificationBell.css';

/**
 * Robust date parser handling SQLite timestamps ("YYYY-MM-DD HH:MM:SS"),
 * ISO strings, and standard Date strings.
 */
function parseNotificationDate(dateStr) {
    if (!dateStr) return new Date();
    let s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T') + 'Z';
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !s.includes('+')) {
        s += 'Z';
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date(dateStr) : d;
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = parseNotificationDate(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
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

function getToastTypeLabel(type) {
    switch (type) {
        case 'upload': return 'New Upload';
        case 'access_request': return 'Access Request';
        case 'user_login': return 'User Login';
        default: return 'Notification';
    }
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);
    const dropdownRef = useRef(null);
    const shownIdsRef = useRef(new Set());
    const navigate = useNavigate();

    const dismissToast = useCallback((toastId) => {
        setToasts((prev) => prev.map((t) => (t.id === toastId ? { ...t, exiting: true } : t)));
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 300);
    }, []);

    const fetchSummary = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/api/notifications/summary');
            const recent = data.recent || [];
            setNotifications(recent);
            setTotal(data.total || 0);

            // Calculate unread count (recent within last 24h)
            const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const recentCount = recent.filter(n => parseNotificationDate(n.created_at).getTime() > oneDayAgo).length;
            setUnreadCount(recentCount);

            // Auto-pop toasts for any notifications created in the last 15 minutes that haven't been popped in this session
            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
            const currentShown = shownIdsRef.current;
            const newNotifsToToast = [];

            for (const n of recent) {
                const createdAtMs = parseNotificationDate(n.created_at).getTime();
                if (!currentShown.has(n.id) && createdAtMs > fifteenMinutesAgo) {
                    currentShown.add(n.id);
                    newNotifsToToast.push(n);
                }
            }

            if (newNotifsToToast.length > 0) {
                const toastsToAdd = newNotifsToToast.slice(0, 3).map((n) => ({
                    id: n.id,
                    type: n.type,
                    title: n.title,
                    message: n.message,
                    actor: n.actor_name || n.actor_email || 'System',
                    time: formatRelativeTime(n.created_at),
                    exiting: false,
                }));
                setToasts((prev) => [...toastsToAdd, ...prev].slice(0, 5));
            }
        } catch (err) {
            console.error('[NotificationBell] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-dismiss toasts after 5 seconds
    useEffect(() => {
        if (toasts.length === 0) return;
        const timers = toasts
            .filter((t) => !t.exiting)
            .map((t) =>
                setTimeout(() => dismissToast(t.id), 5000)
            );
        return () => timers.forEach(clearTimeout);
    }, [toasts, dismissToast]);

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(fetchSummary, 4000); // Poll every 4s for fast live updates
        return () => clearInterval(interval);
    }, [fetchSummary]);

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

            {/* Toast popup notifications rendered in document.body via Portal */}
            {toasts.length > 0 && createPortal(
                <div className="notif-toast-container">
                    {toasts.map((t) => (
                        <div
                            key={t.id}
                            className={`notif-toast ${t.exiting ? 'notif-toast--exit' : ''}`}
                            onClick={() => dismissToast(t.id)}
                            role="alert"
                        >
                            <div className="notif-toast__icon-wrapper">
                                {getNotificationIcon(t.type)}
                            </div>
                            <div className="notif-toast__content">
                                <div className="notif-toast__header">
                                    <span className={`notif-toast__type notif-toast__type--${t.type}`}>
                                        {getToastTypeLabel(t.type)}
                                    </span>
                                    <span className="notif-toast__time">{t.time}</span>
                                </div>
                                <div className="notif-toast__message">{t.message}</div>
                                <div className="notif-toast__actor">{t.actor}</div>
                            </div>
                            <button
                                type="button"
                                className="notif-toast__close"
                                onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }}
                                aria-label="Dismiss notification"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                            <div className="notif-toast__progress" />
                        </div>
                    ))}
                </div>,
                document.body
            )}

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
