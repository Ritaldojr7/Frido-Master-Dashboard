import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext';
import './ManpowerDashboard.css';

// Configurable constants
const LOP_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdc2H_4ZJ6b-zF6nBq_8rLwK1gC5a_X1uY-aG7e3r2K1e0W-Q/viewform?embedded=true';

// Helper to get today's date in IST (UTC+5:30)
function getTodayIST() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const yyyy = ist.getFullYear();
    const mm = String(ist.getMonth() + 1).padStart(2, '0');
    const dd = String(ist.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Helper to get past date in IST
function getPastDateIST(daysAgo) {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    ist.setDate(ist.getDate() - daysAgo);
    const yyyy = ist.getFullYear();
    const mm = String(ist.getMonth() + 1).padStart(2, '0');
    const dd = String(ist.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}



export default function ManpowerDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'analytics', 'leaderboard', 'lop'
    
    // States for API data
    const [attendance, setAttendance] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [fetchedAt, setFetchedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [syncing, setSyncing] = useState(false);

    // States for Attendance filters
    const [dateFilter, setDateFilter] = useState('');
    const [verticalFilter, setVerticalFilter] = useState('all');

    // States for Monthly Analytics
    const [selectedMonth, setSelectedMonth] = useState('');
    const [hoveredCategory, setHoveredCategory] = useState(null); // 'full', 'half', 'absent'
    const [analyticsTableFilter, setAnalyticsTableFilter] = useState('all'); // 'all', 'full', 'half', 'absent'

    // States for Leaderboard
    const [leaderboardPeriodType, setLeaderboardPeriodType] = useState('today'); // 'today', 'month', 'custom'
    const [customStartDate, setCustomStartDate] = useState(getPastDateIST(7));
    const [customEndDate, setCustomEndDate] = useState(getTodayIST());
    const [leaderboardVertical, setLeaderboardVertical] = useState('all');
    const [leaderboardSortBy, setLeaderboardSortBy] = useState('calls'); // 'calls' or 'sales'
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    // Fetch master attendance dataset
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch('/api/manpower');
            setAttendance(data.attendance || []);
            setFetchedAt(data.fetchedAt);
            setWarnings(data.warnings || []);

            // Set default date filter to today's date or the first available date
            const today = getTodayIST();
            const uniqueDates = [...new Set((data.attendance || []).map(r => r.date))];
            if (uniqueDates.includes(today)) {
                setDateFilter(today);
            } else if (uniqueDates.length > 0) {
                setDateFilter(uniqueDates[0]);
            } else {
                setDateFilter(today);
            }

            // Set default selected month to the most recent month
            const uniqueMonths = [...new Set((data.attendance || []).map(r => r.date.substring(0, 7)))];
            if (uniqueMonths.length > 0) {
                setSelectedMonth(uniqueMonths[0]);
            } else {
                setSelectedMonth(today.substring(0, 7));
            }

            // Load status info
            await apiFetch('/api/manpower/status');
        } catch (err) {
            console.error('[Manpower Dashboard] Failed to load initial data:', err);
            setError(err.message || 'Failed to load manpower attendance data.');
        } finally {
            setLoading(false);
        }
    };

    // Load leaderboard data
    const fetchLeaderboard = useCallback(async () => {
        setLeaderboardLoading(true);
        try {
            const today = getTodayIST();
            let url = `/api/manpower/leaderboard?vertical=${leaderboardVertical}&sortBy=${leaderboardSortBy}`;
            if (leaderboardPeriodType === 'today') {
                url += `&period=${today}`;
            } else if (leaderboardPeriodType === 'month') {
                url += `&period=${selectedMonth}`;
            } else {
                url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
            }
            const data = await apiFetch(url);
            setLeaderboardData(data);
        } catch (err) {
            console.error('[Manpower Dashboard] Failed to load leaderboard:', err);
        } finally {
            setLeaderboardLoading(false);
        }
    }, [leaderboardPeriodType, selectedMonth, leaderboardVertical, leaderboardSortBy, customStartDate, customEndDate]);

    // Trigger manual sync
    const handleSync = async () => {
        setSyncing(true);
        try {
            await apiFetch('/api/manpower/sync', { method: 'POST' });
            await fetchData();
        } catch (err) {
            alert(`Sync failed: ${err.message}`);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'leaderboard') {
            fetchLeaderboard();
        }
    }, [activeTab, fetchLeaderboard]);

    // Unique dates and verticals for dropdown filters
    const uniqueDates = useMemo(() => {
        return [...new Set(attendance.map(r => r.date))].sort((a, b) => b.localeCompare(a));
    }, [attendance]);

    const uniqueVerticals = useMemo(() => {
        return [...new Set(attendance.map(r => r.vertical))].sort();
    }, [attendance]);

    const uniqueMonths = useMemo(() => {
        return [...new Set(attendance.map(r => r.date.substring(0, 7)))].sort((a, b) => b.localeCompare(a));
    }, [attendance]);

    // Client-side filtered attendance records (Daily View)
    const filteredAttendance = useMemo(() => {
        return attendance.filter(r => {
            const matchesDate = r.date === dateFilter;
            const matchesVertical = verticalFilter === 'all' || r.vertical === verticalFilter;
            return matchesDate && matchesVertical;
        });
    }, [attendance, dateFilter, verticalFilter]);

    // Stat Cards calculations for filtered daily attendance
    const dailyStats = useMemo(() => {
        let morningIn = 0;
        let morningPending = 0;
        let eveningOut = 0;
        let eveningPending = 0;

        filteredAttendance.forEach(r => {
            // Stats are computed on duty days (morning_roster/evening_roster === 'DS') and excluding LOP
            if (!r.is_lop) {
                if (r.morning_roster === 'DS') {
                    if (r.morning_time) morningIn++;
                    else morningPending++;
                }
                if (r.evening_roster === 'DS') {
                    if (r.evening_time) eveningOut++;
                    else eveningPending++;
                }
            }
        });

        return { morningIn, morningPending, eveningOut, eveningPending };
    }, [filteredAttendance]);

    // Monthly Analytics calculations
    const monthlyAnalytics = useMemo(() => {
        if (!selectedMonth) return { list: [], totals: { full: 0, half: 0, absent: 0 }, byVertical: {} };

        const monthlyRecords = attendance.filter(r => r.date.startsWith(selectedMonth));
        const employeeMap = {};
        const byVertical = {};
        let totalFull = 0;
        let totalHalf = 0;
        let totalAbsent = 0;

        monthlyRecords.forEach(r => {
            const key = `${r.agent_name.toLowerCase()}|${r.email.toLowerCase()}`;
            if (!employeeMap[key]) {
                employeeMap[key] = {
                    name: r.agent_name,
                    email: r.email,
                    vertical: r.vertical,
                    full: 0,
                    half: 0,
                    absent: 0
                };
            }

            const emp = employeeMap[key];
            const vKey = r.vertical;
            if (!byVertical[vKey]) {
                byVertical[vKey] = { full: 0, half: 0, absent: 0 };
            }

            if (r.is_lop) {
                emp.absent++;
                byVertical[vKey].absent++;
                totalAbsent++;
            } else if (r.morning_roster === 'OFF') {
                if (r.morning_time && r.evening_time) {
                    emp.full++;
                    byVertical[vKey].full++;
                    totalFull++;
                } else if (r.morning_time || r.evening_time) {
                    emp.half++;
                    byVertical[vKey].half++;
                    totalHalf++;
                }
            } else {
                if (r.morning_time && r.evening_time) {
                    emp.full++;
                    byVertical[vKey].full++;
                    totalFull++;
                } else if (r.morning_time || r.evening_time) {
                    emp.half++;
                    byVertical[vKey].half++;
                    totalHalf++;
                } else {
                    emp.absent++;
                    byVertical[vKey].absent++;
                    totalAbsent++;
                }
            }
        });

        return {
            list: Object.values(employeeMap),
            totals: { full: totalFull, half: totalHalf, absent: totalAbsent },
            byVertical
        };
    }, [attendance, selectedMonth]);

    // Filtered monthly list based on category clicked
    const filteredAnalyticsList = useMemo(() => {
        const list = monthlyAnalytics.list;
        if (analyticsTableFilter === 'full') return list.filter(r => r.full > 0);
        if (analyticsTableFilter === 'half') return list.filter(r => r.half > 0);
        if (analyticsTableFilter === 'absent') return list.filter(r => r.absent > 0);
        return list;
    }, [monthlyAnalytics.list, analyticsTableFilter]);

    // Draw inline SVG Doughnut chart paths
    const doughnutSVG = useMemo(() => {
        const { full, half, absent } = monthlyAnalytics.totals;
        const total = full + half + absent;
        if (total === 0) return null;

        const r = 40;
        const c = 2 * Math.PI * r; // ~251.32

        const fullPct = full / total;
        const halfPct = half / total;
        const absentPct = absent / total;

        const strokeDasharrayFull = `${(fullPct * c).toFixed(1)} ${c}`;
        const strokeDasharrayHalf = `${(halfPct * c).toFixed(1)} ${c}`;
        const strokeDasharrayAbsent = `${(absentPct * c).toFixed(1)} ${c}`;

        const strokeOffsetFull = 0;
        const strokeOffsetHalf = -(fullPct * c);
        const strokeOffsetAbsent = -((fullPct + halfPct) * c);

        const isFullHovered = hoveredCategory === 'full';
        const isFullDimmed = hoveredCategory && !isFullHovered;

        const isHalfHovered = hoveredCategory === 'half';
        const isHalfDimmed = hoveredCategory && !isHalfHovered;

        const isAbsentHovered = hoveredCategory === 'absent';
        const isAbsentDimmed = hoveredCategory && !isAbsentHovered;

        return (
            <svg viewBox="0 0 100 100" className="analytics__doughnut-svg">
                {/* Background base */}
                <circle cx="50" cy="50" r={r} fill="transparent" stroke="var(--border-primary)" strokeWidth="12" />
                
                {/* Full Shifts segment */}
                {full > 0 && (
                    <circle
                        cx="50" cy="50" r={r}
                        fill="transparent"
                        stroke="var(--accent-emerald)"
                        strokeWidth={isFullHovered ? 16 : 12}
                        strokeDasharray={strokeDasharrayFull}
                        strokeDashoffset={strokeOffsetFull}
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                        style={{
                            opacity: isFullDimmed ? 0.35 : 1,
                            cursor: 'pointer',
                            transition: 'stroke-width 0.2s ease, opacity 0.2s ease'
                        }}
                        onMouseEnter={() => setHoveredCategory('full')}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'full' ? 'all' : 'full')}
                    />
                )}

                {/* Half Days segment */}
                {half > 0 && (
                    <circle
                        cx="50" cy="50" r={r}
                        fill="transparent"
                        stroke="var(--accent-amber)"
                        strokeWidth={isHalfHovered ? 16 : 12}
                        strokeDasharray={strokeDasharrayHalf}
                        strokeDashoffset={strokeOffsetHalf}
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                        style={{
                            opacity: isHalfDimmed ? 0.35 : 1,
                            cursor: 'pointer',
                            transition: 'stroke-width 0.2s ease, opacity 0.2s ease'
                        }}
                        onMouseEnter={() => setHoveredCategory('half')}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'half' ? 'all' : 'half')}
                    />
                )}

                {/* Absences segment */}
                {absent > 0 && (
                    <circle
                        cx="50" cy="50" r={r}
                        fill="transparent"
                        stroke="var(--accent-rose)"
                        strokeWidth={isAbsentHovered ? 16 : 12}
                        strokeDasharray={strokeDasharrayAbsent}
                        strokeDashoffset={strokeOffsetAbsent}
                        transform="rotate(-90 50 50)"
                        strokeLinecap="round"
                        style={{
                            opacity: isAbsentDimmed ? 0.35 : 1,
                            cursor: 'pointer',
                            transition: 'stroke-width 0.2s ease, opacity 0.2s ease'
                        }}
                        onMouseEnter={() => setHoveredCategory('absent')}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'absent' ? 'all' : 'absent')}
                    />
                )}
                
                <text x="50%" y="46%" textAnchor="middle" dy=".3em" className="analytics__chart-center-val">
                    {(((full + half * 0.5) / total) * 100).toFixed(0)}%
                </text>
                <text x="50%" y="62%" textAnchor="middle" dy=".3em" className="analytics__chart-center-lbl">
                    Attendance
                </text>
            </svg>
        );
    }, [monthlyAnalytics, hoveredCategory, analyticsTableFilter]);

    // Attendance badges resolver
    const renderBadge = (r) => {
        if (r.is_lop) {
            return <span className="m-badge m-badge--rose">Loss of Pay</span>;
        }
        if (r.morning_time && r.evening_time) {
            if (r.morning_roster === 'OFF') {
                return <span className="m-badge m-badge--blue">Worked on Week Off</span>;
            }
            return <span className="m-badge m-badge--emerald">Completed Shift</span>;
        }
        if (r.morning_time) {
            return <span className="m-badge m-badge--amber">Checked In</span>;
        }
        if (r.evening_time) {
            return <span className="m-badge m-badge--purple">Evening Only</span>;
        }
        if (r.morning_roster === 'OFF') {
            return <span className="m-badge m-badge--secondary">Week Off</span>;
        }
        return <span className="m-badge m-badge--rose">Absent</span>;
    };

    if (loading) {
        return (
            <div className="manpower__loading">
                <div className="manpower__spinner"></div>
                <p>Loading Manpower Attendance &amp; Analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="manpower__error">
                <h3>Error Loading Dashboard</h3>
                <p>{error}</p>
                <button className="manpower__btn" onClick={fetchData}>Try Again</button>
            </div>
        );
    }

    return (
        <div className="manpower">
            <header className="manpower__header">
                <div className="manpower__header-info">
                    <h1 className="manpower__title">Manpower Attendance &amp; Performance</h1>
                    <p className="manpower__subtitle">
                        Real-time attendance grid and agent leaderboard synchronized with Slack workflows.
                    </p>
                </div>
                <div className="manpower__header-actions">
                    {fetchedAt && (
                        <span className="manpower__fetched-time">
                            Last synced: {new Date(fetchedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                    <button className="manpower__btn" onClick={handleSync} disabled={syncing}>
                        {syncing ? 'Syncing...' : '↻ Force Sync'}
                    </button>
                </div>
            </header>

            {/* Warnings Alert strip if warnings exist */}
            {warnings.length > 0 && user?.role === 'admin' && (
                <div className="manpower__warnings">
                    <strong>⚠️ Data Parse Warning List:</strong>
                    <ul>
                        {warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Dashboard Navigation Tabs */}
            <nav className="manpower__tabs">
                <button
                    className={`manpower__tab-btn ${activeTab === 'attendance' ? 'manpower__tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('attendance')}
                >
                    Daily Attendance
                </button>
                <button
                    className={`manpower__tab-btn ${activeTab === 'analytics' ? 'manpower__tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    Monthly Analytics
                </button>
                <button
                    className={`manpower__tab-btn ${activeTab === 'leaderboard' ? 'manpower__tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('leaderboard')}
                >
                    Leaderboard
                </button>
                <button
                    className={`manpower__tab-btn ${activeTab === 'lop' ? 'manpower__tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('lop')}
                >
                    Mark LOP
                </button>
            </nav>

            <main className="manpower__content animate-fade-in-up">
                
                {/* ── Tab 1: Daily Attendance ── */}
                {activeTab === 'attendance' && (
                    <div className="attendance-tab">
                        {/* Filters Panel */}
                        <div className="manpower__filter-panel">
                            <div className="manpower__filter-group">
                                <label>Select Date:</label>
                                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                                    {uniqueDates.map(date => {
                                        const isToday = date === getTodayIST();
                                        return (
                                            <option key={date} value={date}>
                                                {isToday ? `Today (${date})` : date}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div className="manpower__filter-group">
                                <label>Vertical Name:</label>
                                <select value={verticalFilter} onChange={(e) => setVerticalFilter(e.target.value)}>
                                    <option value="all">All Verticals</option>
                                    {uniqueVerticals.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Stat Cards */}
                        <div className="manpower__stats-grid">
                            <div className="manpower__stat-card manpower__stat-card--morning-in">
                                <span className="manpower__stat-card-title">Morning In</span>
                                <span className="manpower__stat-card-val text-emerald">{dailyStats.morningIn}</span>
                                <span className="manpower__stat-card-sub">Checked-in today</span>
                            </div>
                            <div className="manpower__stat-card manpower__stat-card--morning-pending">
                                <span className="manpower__stat-card-title">Morning Pending</span>
                                <span className="manpower__stat-card-val text-amber">{dailyStats.morningPending}</span>
                                <span className="manpower__stat-card-sub">Awaiting check-in</span>
                            </div>
                            <div className="manpower__stat-card manpower__stat-card--evening-out">
                                <span className="manpower__stat-card-title">Evening Out</span>
                                <span className="manpower__stat-card-val text-emerald">{dailyStats.eveningOut}</span>
                                <span className="manpower__stat-card-sub">Checked-out today</span>
                            </div>
                            <div className="manpower__stat-card manpower__stat-card--evening-pending">
                                <span className="manpower__stat-card-title">Evening Pending</span>
                                <span className="manpower__stat-card-val text-rose">{dailyStats.eveningPending}</span>
                                <span className="manpower__stat-card-sub">Awaiting checkout</span>
                            </div>
                        </div>

                        {/* Attendance Table */}
                        <div className="manpower__table-wrap">
                            <table className="manpower__table">
                                <thead>
                                    <tr>
                                        <th>Agent details</th>
                                        <th>Vertical</th>
                                        <th>Morning Check In</th>
                                        <th>Evening Check Out</th>
                                        <th>Status badge</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAttendance.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="manpower__table-empty">
                                                No attendance records found for this date/vertical.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAttendance.map((row, idx) => (
                                            <tr key={idx} className={row.designation === 'Team Lead' ? 'manpower__tr--lead' : ''}>
                                                <td>
                                                    <div className="manpower__agent-cell">
                                                        <span className="manpower__agent-name">
                                                            {row.agent_name}
                                                            {row.designation === 'Team Lead' && (
                                                                <span className="manpower__lead-lbl" title="Team Lead">TL</span>
                                                            )}
                                                        </span>
                                                        <span className="manpower__agent-email">{row.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="manpower__vertical-lbl">{row.vertical}</span>
                                                </td>
                                                <td className="manpower__time-cell">
                                                    {row.morning_time ? (
                                                        <span className="manpower__time-badge text-emerald">⏱️ {row.morning_time}</span>
                                                    ) : (
                                                        <span className="manpower__time-pending">-</span>
                                                    )}
                                                </td>
                                                <td className="manpower__time-cell">
                                                    {row.evening_time ? (
                                                        <span className="manpower__time-badge text-emerald">⏱️ {row.evening_time}</span>
                                                    ) : (
                                                        <span className="manpower__time-pending">-</span>
                                                    )}
                                                </td>
                                                <td>{renderBadge(row)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Tab 2: Monthly Analytics ── */}
                {activeTab === 'analytics' && (
                    <div className="analytics-tab">
                        <div className="manpower__filter-panel">
                            <div className="manpower__filter-group">
                                <label>Select Month:</label>
                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                                    {uniqueMonths.map(month => (
                                        <option key={month} value={month}>{month}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className="analytics__charts-grid">
                            {/* Doughnut Chart Card */}
                            <div className="manpower__stat-card analytics__chart-card">
                                <span className="manpower__stat-card-title">Overall Shift Split</span>
                                <div className="analytics__doughnut-wrap">
                                    {doughnutSVG ? doughnutSVG : <p>No data available</p>}
                                    <div className="analytics__legend">
                                        <div
                                            className={`analytics__legend-item`}
                                            onMouseEnter={() => setHoveredCategory('full')}
                                            onMouseLeave={() => setHoveredCategory(null)}
                                            onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'full' ? 'all' : 'full')}
                                            style={{
                                                cursor: 'pointer',
                                                opacity: hoveredCategory && hoveredCategory !== 'full' ? 0.35 : 1,
                                                transition: 'opacity 0.2s ease',
                                                padding: '4px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: analyticsTableFilter === 'full' ? '1px solid var(--border-accent)' : '1px solid transparent',
                                                background: analyticsTableFilter === 'full' ? 'rgba(255,210,0,0.06)' : 'transparent'
                                            }}
                                        >
                                            <span className="analytics__legend-dot bg-emerald"></span>
                                            <span>Full Shifts: <strong>{monthlyAnalytics.totals.full}</strong></span>
                                        </div>
                                        <div
                                            className={`analytics__legend-item`}
                                            onMouseEnter={() => setHoveredCategory('half')}
                                            onMouseLeave={() => setHoveredCategory(null)}
                                            onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'half' ? 'all' : 'half')}
                                            style={{
                                                cursor: 'pointer',
                                                opacity: hoveredCategory && hoveredCategory !== 'half' ? 0.35 : 1,
                                                transition: 'opacity 0.2s ease',
                                                padding: '4px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: analyticsTableFilter === 'half' ? '1px solid var(--border-accent)' : '1px solid transparent',
                                                background: analyticsTableFilter === 'half' ? 'rgba(255,210,0,0.06)' : 'transparent'
                                            }}
                                        >
                                            <span className="analytics__legend-dot bg-amber"></span>
                                            <span>Half Days: <strong>{monthlyAnalytics.totals.half}</strong></span>
                                        </div>
                                        <div
                                            className={`analytics__legend-item`}
                                            onMouseEnter={() => setHoveredCategory('absent')}
                                            onMouseLeave={() => setHoveredCategory(null)}
                                            onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'absent' ? 'all' : 'absent')}
                                            style={{
                                                cursor: 'pointer',
                                                opacity: hoveredCategory && hoveredCategory !== 'absent' ? 0.35 : 1,
                                                transition: 'opacity 0.2s ease',
                                                padding: '4px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: analyticsTableFilter === 'absent' ? '1px solid var(--border-accent)' : '1px solid transparent',
                                                background: analyticsTableFilter === 'absent' ? 'rgba(255,210,0,0.06)' : 'transparent'
                                            }}
                                        >
                                            <span className="analytics__legend-dot bg-rose"></span>
                                            <span>Absences: <strong>{monthlyAnalytics.totals.absent}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stacked Bar by Vertical */}
                            <div className="manpower__stat-card analytics__chart-card">
                                <span className="manpower__stat-card-title">Vertical-wise Split (Hover to explore)</span>
                                <div className="analytics__vertical-bar-list">
                                    {Object.keys(monthlyAnalytics.byVertical).length === 0 ? (
                                        <p className="manpower__table-empty">No vertical data available</p>
                                    ) : (
                                        Object.keys(monthlyAnalytics.byVertical).map(vKey => {
                                            const vData = monthlyAnalytics.byVertical[vKey];
                                            const vTotal = vData.full + vData.half + vData.absent;
                                            const fullPct = vTotal > 0 ? (vData.full / vTotal) * 100 : 0;
                                            const halfPct = vTotal > 0 ? (vData.half / vTotal) * 100 : 0;
                                            const absentPct = vTotal > 0 ? (vData.absent / vTotal) * 100 : 0;

                                            const isFullHovered = hoveredCategory === 'full';
                                            const isHalfHovered = hoveredCategory === 'half';
                                            const isAbsentHovered = hoveredCategory === 'absent';
                                            const hasCategoryHover = !!hoveredCategory;

                                            return (
                                                <div key={vKey} className="analytics__vertical-bar-row">
                                                    <span className="analytics__vertical-bar-lbl">{vKey}</span>
                                                    <div className="analytics__stacked-bar">
                                                        {vData.full > 0 && (
                                                            <div
                                                                className="analytics__bar-segment bg-emerald"
                                                                style={{
                                                                    width: `${fullPct}%`,
                                                                    opacity: hasCategoryHover ? (isFullHovered ? 1 : 0.35) : 1,
                                                                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                                                                    transform: isFullHovered ? 'scaleY(1.3)' : 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title={`Full Shifts: ${vData.full}`}
                                                                onMouseEnter={() => setHoveredCategory('full')}
                                                                onMouseLeave={() => setHoveredCategory(null)}
                                                                onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'full' ? 'all' : 'full')}
                                                            />
                                                        )}
                                                        {vData.half > 0 && (
                                                            <div
                                                                className="analytics__bar-segment bg-amber"
                                                                style={{
                                                                    width: `${halfPct}%`,
                                                                    opacity: hasCategoryHover ? (isHalfHovered ? 1 : 0.35) : 1,
                                                                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                                                                    transform: isHalfHovered ? 'scaleY(1.3)' : 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title={`Half Days: ${vData.half}`}
                                                                onMouseEnter={() => setHoveredCategory('half')}
                                                                onMouseLeave={() => setHoveredCategory(null)}
                                                                onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'half' ? 'all' : 'half')}
                                                            />
                                                        )}
                                                        {vData.absent > 0 && (
                                                            <div
                                                                className="analytics__bar-segment bg-rose"
                                                                style={{
                                                                    width: `${absentPct}%`,
                                                                    opacity: hasCategoryHover ? (isAbsentHovered ? 1 : 0.35) : 1,
                                                                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                                                                    transform: isAbsentHovered ? 'scaleY(1.3)' : 'none',
                                                                    cursor: 'pointer'
                                                                }}
                                                                title={`Absences: ${vData.absent}`}
                                                                onMouseEnter={() => setHoveredCategory('absent')}
                                                                onMouseLeave={() => setHoveredCategory(null)}
                                                                onClick={() => setAnalyticsTableFilter(analyticsTableFilter === 'absent' ? 'all' : 'absent')}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Filter Status Alert strip */}
                        {analyticsTableFilter !== 'all' && (
                            <div className="analytics__active-filter-alert">
                                <span>🔍 Showing only employees with at least one <strong>{analyticsTableFilter === 'full' ? 'Full Shift' : analyticsTableFilter === 'half' ? 'Half Day' : 'Absence'}</strong>.</span>
                                <button className="analytics__reset-filter-btn" onClick={() => setAnalyticsTableFilter('all')}>✕ Reset Filter</button>
                            </div>
                        )}

                        {/* Aggregation Table */}
                        <div className="manpower__table-wrap">
                            <table className="manpower__table">
                                <thead>
                                    <tr>
                                        <th>Employee details</th>
                                        <th>Vertical</th>
                                        <th>Full shifts</th>
                                        <th>Half days</th>
                                        <th>Absences</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAnalyticsList.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="manpower__table-empty">No analytics found.</td>
                                        </tr>
                                    ) : (
                                        filteredAnalyticsList.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="manpower__agent-cell">
                                                        <span className="manpower__agent-name">{row.name}</span>
                                                        <span className="manpower__agent-email">{row.email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="manpower__vertical-lbl">{row.vertical}</span>
                                                </td>
                                                <td className="text-emerald font-semibold">{row.full}</td>
                                                <td className="text-amber font-semibold">{row.half}</td>
                                                <td className="text-rose font-semibold">{row.absent}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Tab 3: Leaderboard ── */}
                {activeTab === 'leaderboard' && (
                    <div className="leaderboard-tab">
                        {/* Filters */}
                        <div className="manpower__filter-panel">
                            <div className="manpower__filter-group">
                                <label>Period Toggle:</label>
                                <div className="manpower__toggle-group">
                                    <button
                                        className={`manpower__toggle-btn ${leaderboardPeriodType === 'today' ? 'manpower__toggle-btn--active' : ''}`}
                                        onClick={() => setLeaderboardPeriodType('today')}
                                    >
                                        Today
                                    </button>
                                    <button
                                        className={`manpower__toggle-btn ${leaderboardPeriodType === 'month' ? 'manpower__toggle-btn--active' : ''}`}
                                        onClick={() => setLeaderboardPeriodType('month')}
                                    >
                                        Month
                                    </button>
                                    <button
                                        className={`manpower__toggle-btn ${leaderboardPeriodType === 'custom' ? 'manpower__toggle-btn--active' : ''}`}
                                        onClick={() => setLeaderboardPeriodType('custom')}
                                    >
                                        Custom Range
                                    </button>
                                </div>
                            </div>
                            {leaderboardPeriodType === 'custom' && (
                                <>
                                    <div className="manpower__filter-group">
                                        <label>Start Date:</label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="manpower__date-input"
                                        />
                                    </div>
                                    <div className="manpower__filter-group">
                                        <label>End Date:</label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="manpower__date-input"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="manpower__filter-group">
                                <label>Vertical Filter:</label>
                                <select value={leaderboardVertical} onChange={(e) => setLeaderboardVertical(e.target.value)}>
                                    <option value="all">All Verticals</option>
                                    {uniqueVerticals.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="manpower__filter-group">
                                <label>Sort Rankings By:</label>
                                <select value={leaderboardSortBy} onChange={(e) => setLeaderboardSortBy(e.target.value)}>
                                    <option value="calls">Total Calls</option>
                                    <option value="sales">Total Sales</option>
                                </select>
                            </div>
                        </div>

                        {leaderboardLoading ? (
                            <div className="manpower__table-loading">Loading Leaderboard rankings...</div>
                        ) : (
                            <>
                                {/* Top Performer Summary strip */}
                                <div className="leaderboard__summary-strip">
                                    <h3 className="leaderboard__summary-heading">🎖️ Top Performers per Vertical</h3>
                                    <div className="leaderboard__summary-cards">
                                        {!leaderboardData?.rollups || leaderboardData.rollups.length === 0 ? (
                                            <p className="manpower__table-empty">No performers available.</p>
                                        ) : (
                                            leaderboardData.rollups.map((rollup, idx) => {
                                                if (!rollup.top_performer) return null;
                                                return (
                                                    <div key={idx} className="leaderboard__summary-card">
                                                        <span className="leaderboard__summary-card-v">{rollup.vertical}</span>
                                                        <span className="leaderboard__summary-card-name">🥇 {rollup.top_performer.agent_name}</span>
                                                        <div className="leaderboard__summary-card-stats">
                                                            <span>Calls: <strong>{rollup.top_performer.total_calls}</strong></span>
                                                            <span>Sales: <strong>₹{rollup.top_performer.total_sales.toLocaleString()}</strong></span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Ranked Table */}
                                <div className="manpower__table-wrap">
                                    <table className="manpower__table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '80px' }}>Rank</th>
                                                <th>Agent details</th>
                                                <th>Vertical</th>
                                                <th>Total Calls</th>
                                                <th>Total Sales</th>
                                                <th>Proof capture</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!leaderboardData?.rankedAgents || leaderboardData.rankedAgents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="manpower__table-empty">No data available for the period.</td>
                                                </tr>
                                            ) : (
                                                leaderboardData.rankedAgents.map((row, idx) => (
                                                    <tr key={idx} className={row.rank <= 3 ? `leaderboard__tr--top${row.rank}` : ''}>
                                                        <td>
                                                            <div className="leaderboard__rank-cell">
                                                                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="manpower__agent-cell">
                                                                <span className="manpower__agent-name">{row.agent_name}</span>
                                                                <span className="manpower__agent-email">{row.email}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="manpower__vertical-lbl">{row.vertical}</span>
                                                        </td>
                                                        <td className="font-semibold">{row.total_calls}</td>
                                                        <td className="font-semibold text-emerald">₹{row.total_sales.toLocaleString()}</td>
                                                        <td>
                                                            {row.screenshot_url ? (
                                                                <a
                                                                    href={row.screenshot_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="leaderboard__proof-link"
                                                                >
                                                                    🖼️ View Screen
                                                                </a>
                                                            ) : (
                                                                <span className="leaderboard__proof-missing">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Tab 4: Mark LOP ── */}
                {activeTab === 'lop' && (
                    <div className="iframe-dashboard" style={{ height: '700px', padding: 0, border: 'none', background: 'transparent' }}>
                        <div className="iframe-dashboard__frame-wrap" style={{ height: '100%', border: 'none', boxShadow: 'none', background: 'transparent' }}>
                            <iframe
                                className="iframe-dashboard__frame"
                                src={LOP_FORM_URL}
                                title="Mark Loss of Pay (LOP) Form"
                                allow="clipboard-write"
                                style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)', border: 'none' }}
                            />
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
