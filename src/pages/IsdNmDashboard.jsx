import { useState, useEffect } from 'react';
import { useDashboardData } from '../context/DashboardDataContext';
import { canSeeIsdResource } from '../config/permissions';
import { useAuth, apiFetch } from '../context/AuthContext';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import NoticeAttachmentList from '../components/NoticeAttachmentList/NoticeAttachmentList';
import Typewriter from '../components/Typewriter/Typewriter';
import './SubPage.css';

export default function IsdNmDashboard() {
    const { isdNm: isdNmData } = useDashboardData();
    const { user } = useAuth();
    const [notices, setNotices] = useState([]);

    useEffect(() => {
        let isMounted = true;
        const fetchNoticeFeed = async () => {
            try {
                const response = await apiFetch('/api/notices/feed');
                if (isMounted) {
                    setNotices(response.notices || []);
                }
            } catch (err) {
                console.warn('Unable to load notice feed:', err.message);
            }
        };
        fetchNoticeFeed();
        const interval = window.setInterval(fetchNoticeFeed, 60_000);
        return () => {
            isMounted = false;
            window.clearInterval(interval);
        };
    }, []);

    const formatSentAt = (value) => {
        if (!value) return 'Unknown time';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Unknown time';
        return date.toLocaleString([], {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="subpage">
            <div className="subpage__header animate-fade-in-up">
                <h1 className="subpage__title">
                    <Typewriter text={isdNmData.title} speed={70} />
                </h1>
                <p className="subpage__subtitle">
                Welcome to Inside Sales Department Non-Mobility. This centralised hub empowers sales agents with quick access to CRMs, Payments Details, HR policies, CS &amp; Logistics and learning resources etc. Here, agents can get what they need, to enable sales, without scrolling or wasting time.
                </p>
            </div>

            <div className="subpage__notices animate-fade-in-up" style={{ animationDelay: '40ms' }}>
                <h2 className="subpage__notices-title">ISD NM notice center</h2>
                {notices.length === 0 ? (
                    <p className="subpage__notices-empty">No ISD NM notices right now.</p>
                ) : (
                    <div className="subpage__notices-list">
                        {notices.map((notice) => (
                            <article key={notice.id} className="subpage__notice-item">
                                <div className="subpage__notice-meta">
                                    <span>From {notice.sender_name || notice.created_by_name || 'Frido Admin'}</span>
                                    <span>{formatSentAt(notice.created_at)}</span>
                                    <span className={`subpage__notice-status subpage__notice-status--${notice.acknowledged_at ? 'ack' : notice.dismissed_at ? 'dismissed' : 'new'}`}>
                                        {notice.acknowledged_at ? 'Acknowledged' : notice.dismissed_at ? 'Dismissed' : 'New'}
                                    </span>
                                </div>
                                <h3 className="subpage__notice-heading">{notice.title}</h3>
                                <p className="subpage__notice-body">{notice.body}</p>
                                <NoticeAttachmentList attachments={notice.attachments} />
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <div className="subpage__sections">
                {isdNmData.sections.map((section, idx) => {
                    const links = section.links
                        .filter((l) => canSeeIsdResource(user, l.isdAccess || 'executive'))
                        .map(({ isdAccess: _tier, ...link }) => link);
                    if (links.length === 0) return null;
                    return (
                        <SectionGroup
                            key={section.id}
                            title={section.title}
                            icon={section.icon}
                            accentColor={section.accentColor}
                            links={links}
                            animationBase={idx * 80}
                        />
                    );
                })}
            </div>
        </div>
    );
}
