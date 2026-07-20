/**
 * Daily Inventory Dashboard.
 *
 * Two tiers, mirroring the server:
 *   - Uploaders (INVENTORY_UPLOADER_EMAILS + admins) can push a new sheet.
 *   - Executives and admins view the latest snapshot everyone shares.
 *
 * The upload control is hidden for non-uploaders as an affordance only; the real check
 * lives in server/routes/inventory.js.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { apiFetch } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './DailyInventory.css';

const PAGE_SIZE = 50;
const STATUS_CLASS = {
    Reorder: 'reorder',
    'Zero Sale': 'zero',
    Sufficient: 'sufficient',
};

/**
 * Chart colours come from the stylesheet rather than literals so the two themes stay in
 * sync with the tokens, and so the light-mode amber step (which the brand yellow fails
 * contrast against a white surface) applies automatically.
 */
function readChartTokens(el) {
    const s = getComputedStyle(el);
    const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
    return {
        reorder: v('--dinv-reorder', '#FFD200'),
        zero: v('--dinv-zero', '#6E7785'),
        sufficient: v('--dinv-sufficient', '#10B981'),
        bar: v('--dinv-bar', '#3B82F6'),
        surface: v('--bg-card', '#141821'),
        grid: v('--border-primary', 'rgba(164,172,185,0.14)'),
        text: v('--text-secondary', '#A4ACB9'),
    };
}

function formatNumber(n) {
    return Number(n || 0).toLocaleString();
}

function formatTimestamp(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function DailyInventory() {
    const { theme } = useTheme();

    const [snapshot, setSnapshot] = useState(null);
    const [canUpload, setCanUpload] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [replacing, setReplacing] = useState(false);

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState({ key: 'daysInvt', dir: 'asc' });
    const [page, setPage] = useState(0);

    const fileInputRef = useRef(null);
    const rootRef = useRef(null);
    const statusCanvas = useRef(null);
    const categoryCanvas = useRef(null);
    const facilityCanvas = useRef(null);
    const chartRefs = useRef({});

    const records = useMemo(() => snapshot?.records ?? [], [snapshot]);

    // ── Load the shared snapshot ───────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch('/api/inventory/latest');
            setSnapshot(data.snapshot);
            setCanUpload(Boolean(data.canUpload));
        } catch (err) {
            setError(err.message || 'Could not load inventory data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // ── Upload ─────────────────────────────────────────────────
    const handleFile = useCallback(
        async (file) => {
            if (!file) return;
            setUploading(true);
            setError(null);
            try {
                const body = new FormData();
                body.append('file', file);
                const data = await apiFetch('/api/inventory/upload', { method: 'POST', body });
                setSnapshot(data.snapshot);
                setReplacing(false);
                setPage(0);
            } catch (err) {
                setError(err.message || 'Upload failed');
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        },
        []
    );

    const onDrop = useCallback(
        (e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer?.files?.[0]);
        },
        [handleFile]
    );

    // ── Derived data ───────────────────────────────────────────
    // Memoised because the chart effect depends on it — a fresh object literal every
    // render would tear down and rebuild all three charts on any state change.
    const summary = useMemo(() => snapshot?.summary ?? {}, [snapshot]);
    const categories = useMemo(
        () => [...new Set(records.map((r) => r.category))].sort(),
        [records]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = records.filter((r) => {
            if (category && r.category !== category) return false;
            if (status && r.status !== status) return false;
            if (q) {
                const hay = `${r.id} ${r.name}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });

        const { key, dir } = sort;
        return [...list].sort((a, b) => {
            let av = a[key];
            let bv = b[key];
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            // Nulls sort last regardless of direction — a missing "days of inventory"
            // is not the smallest value, it is unknown.
            if (av == null) return 1;
            if (bv == null) return -1;
            if (av < bv) return dir === 'asc' ? -1 : 1;
            if (av > bv) return dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [records, search, category, status, sort]);

    const reorderItems = useMemo(
        () =>
            records
                .filter((r) => r.status === 'Reorder')
                .sort((a, b) => (a.daysInvt ?? Infinity) - (b.daysInvt ?? Infinity))
                .slice(0, 25),
        [records]
    );

    const zeroSaleItems = useMemo(
        () =>
            records
                .filter((r) => r.status === 'Zero Sale')
                .sort((a, b) => (b.totalInv || (b.totalNet + b.totalBlocked)) - (a.totalInv || (a.totalNet + a.totalBlocked)))
                .slice(0, 25),
        [records]
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pageItems = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

    // ── Charts ─────────────────────────────────────────────────
    useEffect(() => {
        if (!records.length || !rootRef.current) return undefined;

        const destroy = () => {
            Object.values(chartRefs.current).forEach((c) => c?.destroy());
            chartRefs.current = {};
        };

        /**
         * Deferred by one frame on purpose. ThemeProvider sits above this page, and React
         * flushes effects child-first — so on a theme toggle this effect would otherwise
         * run before ThemeContext has written the new `data-theme` attribute, and the
         * charts would be rebuilt with the outgoing theme's colours. Waiting a frame lets
         * the attribute land and styles recompute before we read the tokens.
         */
        const frame = requestAnimationFrame(() => {
            if (!rootRef.current) return;
            destroy();
            buildCharts(readChartTokens(rootRef.current));
        });

        function buildCharts(t) {
            Chart.defaults.font.family = getComputedStyle(rootRef.current).fontFamily;
            Chart.defaults.color = t.text;

            const statusCounts = {
                Reorder: summary.reorder ?? 0,
                'Zero Sale': summary.zeroSale ?? 0,
                Sufficient: summary.sufficient ?? 0,
            };
            const statusLabels = Object.keys(statusCounts).filter((k) => statusCounts[k] > 0);
            const totalStatusSkus = Object.values(statusCounts).reduce((a, b) => a + b, 0);

            if (statusCanvas.current) {
                chartRefs.current.status = new Chart(statusCanvas.current, {
                    type: 'doughnut',
                    data: {
                        labels: statusLabels,
                        datasets: [
                            {
                                data: statusLabels.map((k) => statusCounts[k]),
                                backgroundColor: statusLabels.map(
                                    (k) =>
                                        ({ Reorder: t.reorder, 'Zero Sale': t.zero, Sufficient: t.sufficient }[k])
                                ),
                                borderColor: t.surface,
                                borderWidth: 2,
                                hoverOffset: 10,
                                hoverBorderWidth: 3,
                            },
                        ],
                    },
                    options: {
                        maintainAspectRatio: false,
                        cutout: '62%',
                        animation: {
                            animateRotate: true,
                            animateScale: true,
                            duration: 1000,
                            easing: 'easeOutQuart',
                        },
                        onHover: (e, elements) => {
                            if (e.native && e.native.target) {
                                e.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                            }
                        },
                        onClick: (e, elements) => {
                            if (elements.length > 0) {
                                const idx = elements[0].index;
                                const clickedStatus = statusLabels[idx];
                                setStatus((prev) => (prev === clickedStatus ? '' : clickedStatus));
                                setPage(0);
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { boxWidth: 10, padding: 14, font: { size: 11.5 } },
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const val = context.raw || 0;
                                        const pctVal = totalStatusSkus ? Math.round((val / totalStatusSkus) * 100) : 0;
                                        return ` ${context.label}: ${formatNumber(val)} SKUs (${pctVal}%) — Click to filter`;
                                    },
                                },
                            },
                        },
                    },
                });
            }

            const catTotals = {};
            records.forEach((r) => {
                catTotals[r.category] = (catTotals[r.category] || 0) + (r.totalNet || 0);
            });
            const catEntries = Object.entries(catTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (categoryCanvas.current) {
                chartRefs.current.category = new Chart(categoryCanvas.current, {
                    type: 'bar',
                    data: {
                        labels: catEntries.map((e) => e[0]),
                        datasets: [
                            {
                                label: 'Net inventory',
                                data: catEntries.map((e) => e[1]),
                                backgroundColor: t.bar,
                                hoverBackgroundColor: t.reorder,
                                borderRadius: 5,
                                maxBarThickness: 16,
                            },
                        ],
                    },
                    options: {
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        animation: {
                            duration: 900,
                            easing: 'easeOutCubic',
                        },
                        onHover: (e, elements) => {
                            if (e.native && e.native.target) {
                                e.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                            }
                        },
                        onClick: (e, elements) => {
                            if (elements.length > 0) {
                                const idx = elements[0].index;
                                const clickedCat = catEntries[idx]?.[0];
                                if (clickedCat) {
                                    setCategory((prev) => (prev === clickedCat ? '' : clickedCat));
                                    setPage(0);
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (context) => ` Net inventory: ${formatNumber(context.raw)} units — Click to filter`,
                                },
                            },
                        },
                        scales: {
                            x: { grid: { color: t.grid }, ticks: { font: { size: 10.5 } } },
                            y: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
                        },
                    },
                });
            }

            const facTotals = {};
            records.forEach((r) => {
                Object.entries(r.netByFacility || {}).forEach(([fac, val]) => {
                    facTotals[fac] = (facTotals[fac] || 0) + val;
                });
            });
            const facEntries = Object.entries(facTotals).sort((a, b) => b[1] - a[1]);

            if (facilityCanvas.current) {
                chartRefs.current.facility = new Chart(facilityCanvas.current, {
                    type: 'bar',
                    data: {
                        labels: facEntries.map((e) => e[0]),
                        datasets: [
                            {
                                label: 'Net inventory',
                                data: facEntries.map((e) => e[1]),
                                backgroundColor: t.bar,
                                hoverBackgroundColor: t.reorder,
                                borderRadius: 5,
                                maxBarThickness: 20,
                            },
                        ],
                    },
                    options: {
                        maintainAspectRatio: false,
                        animation: {
                            duration: 1000,
                            easing: 'easeOutQuart',
                        },
                        onHover: (e, elements) => {
                            if (e.native && e.native.target) {
                                e.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                            }
                        },
                        onClick: (e, elements) => {
                            if (elements.length > 0) {
                                const idx = elements[0].index;
                                const clickedFac = facEntries[idx]?.[0];
                                if (clickedFac) {
                                    setSearch((prev) => (prev === clickedFac ? '' : clickedFac));
                                    setPage(0);
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (context) => ` Net inventory: ${formatNumber(context.raw)} units — Click to search facility`,
                                },
                            },
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 9.5 }, maxRotation: 60, minRotation: 40 },
                            },
                            y: { grid: { color: t.grid }, ticks: { font: { size: 10 } } },
                        },
                    },
                });
            }
        }

        return () => {
            cancelAnimationFrame(frame);
            destroy();
        };
        // `theme` is a dependency so the charts re-read their tokens when the user
        // toggles light/dark — Chart.js bakes colours in at construction time.
    }, [records, summary, theme]);

    // ── Render ─────────────────────────────────────────────────
    const showUploader = canUpload && (!snapshot || replacing);

    const kpis = [
        { label: 'Total SKUs', value: summary.totalSkus, sub: 'tracked today', accent: 'var(--accent)' },
        { label: 'Net Inventory', value: summary.totalNet, sub: 'units across facilities', accent: 'var(--dinv-sufficient)' },
        { label: 'Blocked Inventory', value: summary.totalBlocked, sub: 'units on hold', accent: 'var(--dinv-zero)' },
        { label: 'Reorder Alerts', value: summary.reorder, sub: pct(summary.reorder, summary.totalSkus), accent: 'var(--dinv-reorder)' },
        { label: 'Zero Sale SKUs', value: summary.zeroSale, sub: pct(summary.zeroSale, summary.totalSkus), accent: 'var(--dinv-zero)' },
        { label: 'Sufficient Stock', value: summary.sufficient, sub: pct(summary.sufficient, summary.totalSkus), accent: 'var(--dinv-sufficient)' },
    ];

    function pct(n, total) {
        if (!total) return '—';
        return `${Math.round((n / total) * 100)}% of SKUs`;
    }

    function toggleSort(key) {
        setPage(0);
        setSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: ['totalNet', 'totalBlocked', 'totalInv', 'avgSale'].includes(key) ? 'desc' : 'asc' }
        );
    }

    return (
        <div className="dinv" ref={rootRef}>
            <header className="dinv__header">
                <div>
                    <div className="dinv__eyebrow">ISD · Warehouse Ops</div>
                    <h1 className="dinv__title">Daily Inventory Dashboard</h1>
                    <p className="dinv__subtitle">
                        {snapshot
                            ? `Showing the latest sheet uploaded by ${snapshot.uploadedByEmail}.`
                            : 'No inventory sheet has been uploaded yet.'}
                    </p>
                </div>
                {snapshot && (
                    <div className="dinv__meta">
                        <span className="dinv__chip">
                            <span className="dinv__chip-dot" />
                            Updated {formatTimestamp(snapshot.createdAt)}
                        </span>
                        <span className="dinv__chip">{formatNumber(snapshot.rowCount)} SKUs</span>
                        {canUpload && !replacing && (
                            <button
                                type="button"
                                className="dinv__btn"
                                onClick={() => setReplacing(true)}
                            >
                                Upload new sheet
                            </button>
                        )}
                    </div>
                )}
            </header>

            {loading && <div className="dinv__loading">Loading inventory data…</div>}

            {!loading && error && (
                <div className="dinv__alert dinv__alert--error" role="alert">
                    {error}
                </div>
            )}

            {!loading && !snapshot && !canUpload && (
                <div className="dinv__alert dinv__alert--info">
                    No inventory sheet has been uploaded yet. Once someone from the inventory team
                    uploads today&rsquo;s export, it will appear here automatically.
                </div>
            )}

            {!loading && showUploader && (
                <div
                    className={`dinv__dropzone${dragging ? ' dinv__dropzone--drag' : ''}`}
                    onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                    onDrop={onDrop}
                >
                    <div className="dinv__dropzone-icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M12 3v12M12 3l-4 4M12 3l4 4" />
                            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                        </svg>
                    </div>
                    <h3>{uploading ? 'Uploading…' : "Drop today's inventory sheet here"}</h3>
                    <p>
                        Works with the daily export from your Google Sheet — save it as
                        .xlsx (File &rarr; Download &rarr; Microsoft Excel) and drop it here, or click
                        to browse. The file is parsed on the server and shared with everyone
                        who has view access.
                    </p>
                    <button
                        type="button"
                        className="dinv__btn dinv__btn--primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? 'Uploading…' : 'Choose file'}
                    </button>
                    {replacing && (
                        <button
                            type="button"
                            className="dinv__btn"
                            style={{ marginLeft: 8 }}
                            onClick={() => setReplacing(false)}
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="dinv__file-input"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    <div className="dinv__hint">
                        Expects an &ldquo;Inventory&rdquo; sheet with Product ID, Category, per-facility
                        Net/Blocked inventory, Avg Daily Sale, Days of Invt and Stock Status columns.
                    </div>
                </div>
            )}

            {!loading && snapshot && !replacing && (
                <>
                    <div className="dinv__kpis">
                        {kpis.map((k) => (
                            <div className="dinv__kpi" key={k.label} style={{ '--dinv-kpi-accent': k.accent }}>
                                <div className="dinv__kpi-label">{k.label}</div>
                                <div className="dinv__kpi-value">{formatNumber(k.value)}</div>
                                <div className="dinv__kpi-sub">{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Filters sit directly under the KPIs so the whole page can be scoped
                        before scrolling — they drive the Full inventory table below. */}
                    <div className="dinv__panel dinv__filters">
                        <div className="dinv__controls">
                            <input
                                type="text"
                                placeholder="Search product ID or name…"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                                aria-label="Search inventory"
                            />
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value); setPage(0); }}
                                aria-label="Filter by category"
                            >
                                <option value="">All categories</option>
                                {categories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <select
                                value={status}
                                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                                aria-label="Filter by stock status"
                            >
                                <option value="">All statuses</option>
                                <option value="Reorder">Reorder</option>
                                <option value="Zero Sale">Zero Sale</option>
                                <option value="Sufficient">Sufficient</option>
                            </select>
                        </div>

                        {Boolean(search.trim() || category || status) && (
                            <div className="dinv__search-results">
                                <div className="dinv__search-match-count">
                                    <strong style={{ color: 'var(--accent)' }}>{filtered.length}</strong> {filtered.length === 1 ? 'match' : 'matches'}
                                    {search.trim() && <> for &ldquo;{search.trim()}&rdquo;</>}
                                </div>
                                <div className="dinv__table-scroll">
                                    <table className="dinv__table">
                                        <thead>
                                            <tr>
                                                <th>Product ID</th>
                                                <th>Name</th>
                                                <th>Category</th>
                                                <th style={{ textAlign: 'right' }}>Net Invt</th>
                                                <th style={{ textAlign: 'right' }}>Days of Invt</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length === 0 ? (
                                                <tr className="dinv__empty-row">
                                                    <td colSpan={6}>No SKUs match your search criteria.</td>
                                                </tr>
                                            ) : (
                                                filtered.slice(0, 10).map((r) => (
                                                    <tr key={r.id}>
                                                        <td className="dinv__id">{r.id}</td>
                                                        <td>{r.name}</td>
                                                        <td>{r.category}</td>
                                                        <td className="dinv__num">{formatNumber(r.totalNet)}</td>
                                                        <td className="dinv__num">{r.daysInvt ?? '—'}</td>
                                                        <td>
                                                            <span className={`dinv__status dinv__status--${STATUS_CLASS[r.status] || 'zero'}`}>
                                                                <span className="dinv__status-dot" />
                                                                {r.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="dinv__grid">
                        <div className="dinv__panel">
                            <h4 className="dinv__panel-title">
                                Stock status split <span className="dinv__panel-tag">by SKU</span>
                            </h4>
                            <div className="dinv__chart">
                                <canvas ref={statusCanvas} />
                            </div>
                        </div>
                        <div className="dinv__panel">
                            <h4 className="dinv__panel-title">
                                Net inventory by category <span className="dinv__panel-tag">top 10</span>
                            </h4>
                            <div className="dinv__chart">
                                <canvas ref={categoryCanvas} />
                            </div>
                        </div>
                        <div className="dinv__panel">
                            <h4 className="dinv__panel-title">
                                Net inventory by facility <span className="dinv__panel-tag">units</span>
                            </h4>
                            <div className="dinv__chart">
                                <canvas ref={facilityCanvas} />
                            </div>
                        </div>
                    </div>

                    <div className="dinv__section-title">
                        <h3>Reorder priority</h3>
                        <span className="dinv__count">{formatNumber(summary.reorder)}</span>
                    </div>
                    <div className="dinv__panel" style={{ padding: '6px 18px 14px' }}>
                        <div className="dinv__table-scroll">
                            <table className="dinv__table">
                                <thead>
                                    <tr>
                                        <th>Product ID</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Category</th>
                                        <th style={{ textAlign: 'right' }}>Net Invt</th>
                                        <th style={{ textAlign: 'right' }}>Avg Daily Sale</th>
                                        <th style={{ textAlign: 'right' }}>Days of Invt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reorderItems.length === 0 ? (
                                        <tr className="dinv__empty-row">
                                            <td colSpan={7}>No SKUs are currently flagged for reorder.</td>
                                        </tr>
                                    ) : (
                                        reorderItems.map((r) => (
                                            <tr key={r.id}>
                                                <td className="dinv__id">{r.id}</td>
                                                <td>{r.name}</td>
                                                <td>{r.type}</td>
                                                <td>{r.category}</td>
                                                <td className="dinv__num">{formatNumber(r.totalNet)}</td>
                                                <td className="dinv__num">{formatNumber(r.avgSale)}</td>
                                                <td className="dinv__num">{r.daysInvt ?? '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="dinv__section-title">
                        <h3>Zero sale items</h3>
                        <span className="dinv__count">{formatNumber(summary.zeroSale)}</span>
                    </div>
                    <div className="dinv__panel" style={{ padding: '6px 18px 14px' }}>
                        <div className="dinv__table-scroll">
                            <table className="dinv__table">
                                <thead>
                                    <tr>
                                        <th>Product ID</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Category</th>
                                        <th style={{ textAlign: 'right' }}>Net Invt</th>
                                        <th style={{ textAlign: 'right' }}>Blocked</th>
                                        <th style={{ textAlign: 'right' }}>Total Invt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zeroSaleItems.length === 0 ? (
                                        <tr className="dinv__empty-row">
                                            <td colSpan={7}>No SKUs are currently flagged as zero sale.</td>
                                        </tr>
                                    ) : (
                                        zeroSaleItems.map((r) => (
                                            <tr key={r.id}>
                                                <td className="dinv__id">{r.id}</td>
                                                <td>{r.name}</td>
                                                <td>{r.type}</td>
                                                <td>{r.category}</td>
                                                <td className="dinv__num">{formatNumber(r.totalNet)}</td>
                                                <td className="dinv__num">{formatNumber(r.totalBlocked)}</td>
                                                <td className="dinv__num">{formatNumber(r.totalInv || (r.totalNet + r.totalBlocked))}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="dinv__section-title">
                        <h3>Full inventory</h3>
                        <span className="dinv__count">{formatNumber(filtered.length)}</span>
                    </div>
                    <div className="dinv__panel">
                        <div className="dinv__table-scroll">
                            <table className="dinv__table">
                                <thead>
                                    <tr>
                                        {[
                                            ['id', 'Product ID', false],
                                            ['name', 'Name', false],
                                            ['type', 'Type', false],
                                            ['category', 'Category', false],
                                            ['totalNet', 'Net Invt', true],
                                            ['totalBlocked', 'Blocked', true],
                                            ['totalInv', 'Total Invt', true],
                                            ['avgSale', 'Avg Daily Sale', true],
                                            ['daysInvt', 'Days of Invt', true],
                                            ['status', 'Status', false],
                                        ].map(([key, label, numeric]) => (
                                            <th
                                                key={key}
                                                data-sortable="true"
                                                className={sort.key === key ? 'is-sorted' : undefined}
                                                style={numeric ? { textAlign: 'right' } : undefined}
                                                onClick={() => toggleSort(key)}
                                            >
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageItems.length === 0 ? (
                                        <tr className="dinv__empty-row">
                                            <td colSpan={10}>No SKUs match these filters.</td>
                                        </tr>
                                    ) : (
                                        pageItems.map((r) => (
                                            <tr key={r.id}>
                                                <td className="dinv__id">{r.id}</td>
                                                <td>{r.name}</td>
                                                <td>{r.type}</td>
                                                <td>{r.category}</td>
                                                <td className="dinv__num">{formatNumber(r.totalNet)}</td>
                                                <td className="dinv__num">{formatNumber(r.totalBlocked)}</td>
                                                <td className="dinv__num">{formatNumber(r.totalInv || (r.totalNet + r.totalBlocked))}</td>
                                                <td className="dinv__num">{formatNumber(r.avgSale)}</td>
                                                <td className="dinv__num">{r.daysInvt ?? '—'}</td>
                                                <td>
                                                    <span className={`dinv__status dinv__status--${STATUS_CLASS[r.status] || 'zero'}`}>
                                                        <span className="dinv__status-dot" />
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="dinv__pagination">
                            <div>
                                {filtered.length
                                    ? `Showing ${safePage * PAGE_SIZE + 1}–${Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)} of ${formatNumber(filtered.length)}`
                                    : 'No results'}
                            </div>
                            <div className="dinv__pagination-btns">
                                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage <= 0}>
                                    ← Prev
                                </button>
                                <button type="button" onClick={() => setPage((p) => p + 1)} disabled={safePage >= totalPages - 1}>
                                    Next →
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
