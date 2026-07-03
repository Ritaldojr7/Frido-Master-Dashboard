import React from 'react';
import { useAuth } from '../context/AuthContext';
import { STORE_EMAIL_MAP } from '../config/permissions';
import './IframeDashboard.css';

export default function StoreAnalyticsConsole() {
    const { user } = useAuth();
    const userEmail = user?.email?.toLowerCase();
    const isStoreManager = Object.prototype.hasOwnProperty.call(STORE_EMAIL_MAP, userEmail);

    const iframeUrl = isStoreManager
        ? `/fes-sm-dashboard/index.html?store=${encodeURIComponent(STORE_EMAIL_MAP[userEmail])}&role=manager`
        : `/fes-sm-dashboard/index.html`;

    return (
        <div className="iframe-dashboard" style={{ height: '100%', padding: 0 }}>
            <div className="iframe-dashboard__frame-wrap" style={{ height: '100%', border: 'none', borderRadius: 0, boxShadow: 'none', background: 'transparent' }}>
                <iframe
                    className="iframe-dashboard__frame"
                    src={iframeUrl}
                    title="Store Analytics Console"
                    allow="clipboard-write"
                    style={{ height: '100%', borderRadius: 0, border: 'none' }}
                />
            </div>
        </div>
    );
}
