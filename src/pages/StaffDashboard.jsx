import React, { useEffect, useState } from 'react';
import { useDashboardData } from '../context/DashboardDataContext';
import SectionGroup from '../components/SectionGroup/SectionGroup';
import NoticeAttachmentList from '../components/NoticeAttachmentList/NoticeAttachmentList';
import Typewriter from '../components/Typewriter/Typewriter';
import { apiFetch } from '../context/AuthContext';
import {
    getRetailStructureContacts,
    getStaffEscalationContacts,
} from '../config/organizationConfig';
import './SubPage.css';

function ContactTable({ rows, namePrefix }) {
    return (
        <div className="subpage__contacts-table-wrapper">
            <table className="subpage__contacts-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>POC For</th>
                        <th>Email</th>
                        <th>Mobile Number</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((contact, idx) => (
                        <tr key={`${contact.pocFor}-${idx}`}>
                            <td className="subpage__contact-name">
                                {namePrefix ? `${namePrefix(idx)}: ${contact.name}` : contact.name}
                            </td>
                            <td>
                                <span className="subpage__contact-badge">{contact.pocFor}</span>
                            </td>
                            <td>
                                {contact.email ? (
                                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                ) : (
                                    '—'
                                )}
                            </td>
                            <td>
                                {contact.phone ? (
                                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                                ) : (
                                    '—'
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function StaffDashboard() {
    const { staffRetail } = useDashboardData();
    const data = staffRetail;
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
                    <Typewriter text={data.title} speed={70} />
                </h1>
                <p className="subpage__subtitle">
                    Your one stop hub for all links and accessibility
                </p>
            </div>

            <div className="subpage__sections">
                {data.sections.map((section, idx) => (
                    <SectionGroup
                        key={section.id}
                        sectionId={section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                        title={section.title}
                        icon={section.icon}
                        accentColor={section.accentColor}
                        links={section.links}
                        animationBase={idx * 80}
                    />
                ))}
            </div>

            <div className="subpage__notices animate-fade-in-up" style={{ animationDelay: '60ms' }}>
                <h2 className="subpage__notices-title">Notice Center</h2>
                {notices.length === 0 ? (
                    <p className="subpage__notices-empty">No active notices right now.</p>
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

            <div className="subpage__contacts animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                <h2 className="subpage__contacts-title">Escalation Matrix</h2>
                {getStaffEscalationContacts().length === 0 ? (
                    <p className="subpage__notices-empty">Contact list not configured.</p>
                ) : (
                    <ContactTable rows={getStaffEscalationContacts()} namePrefix={(idx) => `Level ${idx + 1}`} />
                )}
            </div>

            <div className="subpage__contacts animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <h2 className="subpage__contacts-title">Retail Structure - Leaders &amp; POCs</h2>
                {getRetailStructureContacts().length === 0 ? (
                    <p className="subpage__notices-empty">Contact list not configured.</p>
                ) : (
                    <ContactTable rows={getRetailStructureContacts()} />
                )}
            </div>
        </div>
    );
}
