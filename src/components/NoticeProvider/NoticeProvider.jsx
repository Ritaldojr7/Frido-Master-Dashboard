import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, useAuth } from '../../context/AuthContext';
import NoticeAttachmentList from '../NoticeAttachmentList/NoticeAttachmentList';
import './NoticeProvider.css';

function formatNoticeDateTime(value) {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function NoticeProvider({ children }) {
    const { user, isAuthenticated } = useAuth();
    const [notices, setNotices] = useState([]);
    const [busyNoticeId, setBusyNoticeId] = useState('');
    const isStaffUser =
        user && user.role !== 'admin' && user.role !== 'feedback';

    const fetchNotices = useCallback(async () => {
        if (!isAuthenticated || !isStaffUser) {
            setNotices([]);
            return;
        }

        try {
            const data = await apiFetch('/api/notices/active');
            setNotices(data.notices || []);
        } catch (err) {
            console.warn('Unable to fetch notices:', err.message);
        }
    }, [isAuthenticated, isStaffUser]);

    useEffect(() => {
        fetchNotices();
        if (!isAuthenticated || !isStaffUser) return undefined;

        const interval = window.setInterval(fetchNotices, 45_000);
        return () => window.clearInterval(interval);
    }, [fetchNotices, isAuthenticated, isStaffUser]);

    const currentNotice = useMemo(() => notices[0], [notices]);

    const noticeEyebrow = useMemo(() => {
        const n = currentNotice;
        if (!n) return '';
        if (n.priority === 'urgent') return 'Urgent notice';
        return n.audience === 'isd_nm' ? 'ISD NM notice' : 'Staff notice';
    }, [currentNotice]);

    const acknowledge = async (noticeId) => {
        setBusyNoticeId(noticeId);
        try {
            await apiFetch(`/api/notices/${noticeId}/ack`, { method: 'POST' });
            setNotices((prev) => prev.filter((notice) => notice.id !== noticeId));
        } finally {
            setBusyNoticeId('');
        }
    };

    const dismiss = async (noticeId) => {
        setBusyNoticeId(noticeId);
        try {
            await apiFetch(`/api/notices/${noticeId}/dismiss`, { method: 'POST' });
            setNotices((prev) => prev.filter((notice) => notice.id !== noticeId));
        } finally {
            setBusyNoticeId('');
        }
    };

    return (
        <>
            {children}
            {currentNotice && (
                <div className="notice-popup__overlay" role="presentation">
                    <div className={`notice-popup notice-popup--${currentNotice.priority}`} role="dialog" aria-modal="true" aria-labelledby="notice-popup-title">
                        <div className="notice-popup__eyebrow">
                            {noticeEyebrow}
                        </div>
                        <div className="notice-popup__meta">
                            <span>From {currentNotice.sender_name || currentNotice.created_by_name || 'Frido Admin'}</span>
                            <span>{formatNoticeDateTime(currentNotice.created_at)}</span>
                        </div>
                        <h2 id="notice-popup-title" className="notice-popup__title">{currentNotice.title}</h2>
                        <p className="notice-popup__body">{currentNotice.body}</p>

                        <NoticeAttachmentList attachments={currentNotice.attachments} />

                        {currentNotice.cta_url && (
                            <a className="notice-popup__cta" href={currentNotice.cta_url} target="_blank" rel="noopener noreferrer">
                                {currentNotice.cta_label || 'Open link'}
                            </a>
                        )}

                        <div className="notice-popup__actions">
                            {!currentNotice.requires_ack && (
                                <button
                                    type="button"
                                    className="notice-popup__btn notice-popup__btn--ghost"
                                    onClick={() => dismiss(currentNotice.id)}
                                    disabled={busyNoticeId === currentNotice.id}
                                >
                                    Dismiss
                                </button>
                            )}
                            <button
                                type="button"
                                className="notice-popup__btn notice-popup__btn--primary"
                                onClick={() => acknowledge(currentNotice.id)}
                                disabled={busyNoticeId === currentNotice.id}
                            >
                                {busyNoticeId === currentNotice.id ? 'Saving...' : 'Acknowledge'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
