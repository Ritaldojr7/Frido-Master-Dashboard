import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../context/AuthContext';
import './OrderDispute.css';

const POLL_MS = 60_000;

export default function OrderDispute() {
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [configured, setConfigured] = useState(true);

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const status = await apiFetch('/api/order-disputes/status');
            setConfigured(Boolean(status?.configured));
            if (!status?.configured) {
                setData(null);
                setError('');
                return;
            }
            const payload = await apiFetch('/api/order-disputes');
            setData(payload);
            setActiveTab((prev) => {
                const len = payload?.tabs?.length ?? 0;
                if (len > 0 && prev >= len) return 0;
                return prev;
            });
        } catch (err) {
            setError(err.message || 'Failed to load order disputes');
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const id = window.setInterval(() => load(true), POLL_MS);
        return () => window.clearInterval(id);
    }, [load]);

    const tabs = data?.tabs ?? [];
    const current = tabs[activeTab];
    const columns = current?.headers?.length
        ? current.headers
        : current?.rows?.[0]
          ? Object.keys(current.rows[0])
          : [];

    return (
        <div className="order-dispute animate-fade-in">
            <header className="order-dispute__header">
                <div>
                    <h1 className="order-dispute__title">Order Dispute</h1>
                    <p className="order-dispute__subtitle">Live data from the shared Google Sheet (refreshes every minute)</p>
                </div>
                <button type="button" className="order-dispute__refresh" onClick={() => load()} disabled={loading}>
                    {loading ? 'Loading…' : 'Refresh'}
                </button>
            </header>

            {!configured ? (
                <div className="order-dispute__notice glass">
                    <p>
                        Google Sheets credentials are not configured on the server yet. Share the spreadsheet with your
                        service account and add <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> to the API environment.
                    </p>
                </div>
            ) : null}

            {error ? <div className="order-dispute__error">{error}</div> : null}

            {tabs.length > 1 ? (
                <div className="order-dispute__tabs">
                    {tabs.map((tab, idx) => (
                        <button
                            key={tab.gid ?? idx}
                            type="button"
                            className={`order-dispute__tab ${activeTab === idx ? 'order-dispute__tab--active' : ''}`}
                            onClick={() => setActiveTab(idx)}
                        >
                            {tab.title}
                        </button>
                    ))}
                </div>
            ) : null}

            {current?.error ? <div className="order-dispute__error">{current.error}</div> : null}

            {data?.fetchedAt ? (
                <p className="order-dispute__meta">
                    Last updated: {new Date(data.fetchedAt).toLocaleString()}
                    {data.cached ? ' (cached)' : ''}
                </p>
            ) : null}

            <div className="order-dispute__table-wrap glass">
                {loading && !current ? (
                    <p className="order-dispute__loading">Loading sheet data…</p>
                ) : current?.rows?.length ? (
                    <table className="order-dispute__table">
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th key={col}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {current.rows.map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                    {columns.map((col) => (
                                        <td key={col}>{row[col] ?? '—'}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : !loading && configured ? (
                    <p className="order-dispute__empty">No rows in this sheet tab.</p>
                ) : null}
            </div>
        </div>
    );
}
