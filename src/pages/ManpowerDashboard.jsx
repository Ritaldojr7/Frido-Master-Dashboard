import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

const LOP_VERTICALS = [
    "Abandoned High Cart",
    "Abandoned Low Cart",
    "Meta LeadGen",
    "Shop on Video Call",
    "Shop on WhatsApp",
    "Immediate Retention Calling",
    "Coupon Code Calling"
];

const LOP_AGENTS = [
    "Arati Anjaney Hande", "Shahrukh Khan", "Akanksha Thakre", "Vishal Singh", 
    "Janhavi Patil", "Ayushi Rathore", "Akanksha Sharma", "Kashish Jaiswal", 
    "Fauziya Praveen", "Abdul Sohail", "Apurva Bagde", "Suyash Avaskar", 
    "Isha Gite", "Vaishnavi Bhaduria", "Parth Ziprae", "Shamal Yeole", 
    "Abhijeet Harde", "Gaurav Seolkar", "Harshal Mutthe", "Pranali Jadhao", 
    "Yashasvi Jain", "Ishwar Walke", "Ankita Ade", "Bhavin Shrimankar", 
    "Sanskruti Ranaware", "Palak Tiwari", "Priyanshi Pranami", "Shyamli Parmar", 
    "Prince Singh", "Sandeep Barman", "Suraj Shinde", "Prathamesh Rathod", 
    "Vimarsh Raina", "Shreyashi Jagtap", "Omkar Mali", "Pranav Shah", 
    "Anjali Pal", "Oshina Mittal", "Kopal Tamrakar", "Shrushri Landge", 
    "Sakshi Mehra", "Vayu Jain", "Vaishnavi Chougule", "Bushra Sheikh", 
    "Akshat Sharma", "Subhalaxmi Satpathy", "Dona Sharma", "Mannaraj Agrawal", 
    "Shilpi", "Khushboo Thawkar"
].sort();

function CustomDropdown({ options, value, onChange, placeholder, searchable }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = searchable 
        ? options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '0.65rem 0.85rem', borderRadius: '8px', border: isOpen ? '1px solid #eab308' : '1px solid #d1d5db', 
                    background: '#fff', color: value ? '#111827' : '#9ca3af', fontSize: '0.95rem', 
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'border-color 0.15s ease'
                }}
            >
                {value || placeholder}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    maxHeight: '250px', overflowY: 'auto', zIndex: 50, display: 'flex', flexDirection: 'column'
                }}>
                    {searchable && (
                        <div style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff' }}>
                            <input 
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                style={{ width: '100%', padding: '0.4rem 0.6rem', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #d1d5db', outline: 'none', fontSize: '0.9rem' }}
                            />
                        </div>
                    )}
                    {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
                        <div 
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); setSearchQuery(''); }}
                            style={{
                                padding: '0.65rem 0.85rem', cursor: 'pointer', fontSize: '0.95rem',
                                background: value === opt ? '#fef3c7' : '#fff', color: '#111827'
                            }}
                            onMouseOver={(e) => { if(value !== opt) e.target.style.background = '#f9fafb' }}
                            onMouseOut={(e) => { if(value !== opt) e.target.style.background = '#fff' }}
                        >
                            {opt}
                        </div>
                    )) : (
                        <div style={{ padding: '0.65rem 0.85rem', color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center' }}>No results found</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ManpowerDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'analytics', 'leaderboard', 'lop'
    
    // States for API data
    const [attendance, setAttendance] = useState([]);
    const [dbLopRecords, setDbLopRecords] = useState([]);
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

    // States for LOP Form
    const [lopFormData, setLopFormData] = useState({ email: user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '', agentName: '', verticalName: '', dateOfLop: '' });
    const [lopSubmitting, setLopSubmitting] = useState(false);
    const [lopSuccess, setLopSuccess] = useState(false);
    const [lopError, setLopError] = useState(null);

    // States for SLA Breaches & Interactive Charts
    const [slaBreachesData, setSlaBreachesData] = useState([]);
    const [slaSearchQuery, setSlaSearchQuery] = useState('');
    const [slaReasonFilter, setSlaReasonFilter] = useState('all');
    const [slaSeverityFilter, setSlaSeverityFilter] = useState('all');
    const [hoveredSlaSlice, setHoveredSlaSlice] = useState(null);
    const [hoveredSeveritySlice, setHoveredSeveritySlice] = useState(null);

    const handleLopSubmit = async (e) => {
        e.preventDefault();
        setLopSubmitting(true);
        setLopSuccess(false);
        setLopError(null);
        try {
            await apiFetch('/api/manpower/lop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lopFormData)
            });
            setLopSuccess(true);
            setLopFormData(prev => ({ ...prev, agentName: '', verticalName: '', dateOfLop: '' }));
            fetchData();
        } catch (err) {
            setLopError(err.message || 'Failed to submit LOP record.');
        } finally {
            setLopSubmitting(false);
        }
    };

    // Fetch master attendance dataset
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch('/api/manpower');
            setAttendance(data.attendance || []);
            setFetchedAt(data.fetchedAt);
            setWarnings(data.warnings || []);

            // Also fetch LOP records from DB
            const lopRes = await apiFetch('/api/manpower/lop');
            if (lopRes && lopRes.data) {
                setDbLopRecords(lopRes.data);
            }

            // Also fetch SLA breach records from DB
            const slaRes = await apiFetch('/api/manpower/sla-breaches');
            if (slaRes && slaRes.data) {
                setSlaBreachesData(slaRes.data);
            }

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

    const lopTrackerData = useMemo(() => {
        const grouped = {};
        dbLopRecords.forEach(r => {
            if (!grouped[r.date_of_lop]) grouped[r.date_of_lop] = [];
            grouped[r.date_of_lop].push(r);
        });
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        return sortedDates.map(date => ({
            date,
            records: grouped[date].sort((a, b) => (a.agent_name || '').localeCompare(b.agent_name || ''))
        }));
    }, [dbLopRecords]);

    // SLA Breaches computations
    const uniqueSlaReasons = useMemo(() => {
        const set = new Set();
        slaBreachesData.forEach(r => {
            if (r.breach_reason) set.add(r.breach_reason);
        });
        return Array.from(set).sort();
    }, [slaBreachesData]);

    const filteredSlaBreaches = useMemo(() => {
        return slaBreachesData.filter(r => {
            const matchesQuery = !slaSearchQuery || 
                (r.agent_name && r.agent_name.toLowerCase().includes(slaSearchQuery.toLowerCase())) ||
                (r.email && r.email.toLowerCase().includes(slaSearchQuery.toLowerCase())) ||
                (r.breach_reason && r.breach_reason.toLowerCase().includes(slaSearchQuery.toLowerCase()));
            
            const matchesReason = slaReasonFilter === 'all' || r.breach_reason === slaReasonFilter;

            let matchesSeverity = true;
            if (slaSeverityFilter === 'critical') matchesSeverity = r.total_breaches_this_month >= 4;
            else if (slaSeverityFilter === 'high') matchesSeverity = r.total_breaches_this_month === 3;
            else if (slaSeverityFilter === 'moderate') matchesSeverity = r.total_breaches_this_month < 3;

            return matchesQuery && matchesReason && matchesSeverity;
        });
    }, [slaBreachesData, slaSearchQuery, slaReasonFilter, slaSeverityFilter]);

    const slaStats = useMemo(() => {
        const total = filteredSlaBreaches.length;
        const uniqueAgents = new Set(filteredSlaBreaches.map(r => r.email || r.agent_name)).size;
        const morningBreaches = filteredSlaBreaches.filter(r => (r.breach_reason || '').toLowerCase().includes('morning')).length;
        const lateBreaches = filteredSlaBreaches.filter(r => (r.breach_reason || '').toLowerCase().includes('late')).length;

        return {
            total,
            uniqueAgents,
            morningBreaches,
            lateBreaches
        };
    }, [filteredSlaBreaches]);

    const repeatBreachers = useMemo(() => {
        const agentMap = {};
        slaBreachesData.forEach(r => {
            const key = r.email || r.agent_name;
            if (!agentMap[key]) {
                agentMap[key] = {
                    agent_name: r.agent_name,
                    email: r.email,
                    max_breaches: 0
                };
            }
            if (r.total_breaches_this_month > agentMap[key].max_breaches) {
                agentMap[key].max_breaches = r.total_breaches_this_month;
            }
        });
        return Object.values(agentMap)
            .filter(a => a.max_breaches >= 3)
            .sort((a, b) => b.max_breaches - a.max_breaches);
    }, [slaBreachesData]);

    const groupedSlaBreaches = useMemo(() => {
        const grouped = {};
        filteredSlaBreaches.forEach(r => {
            const date = r.date || 'Unknown Date';
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(r);
        });
        const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
        return sortedDates.map(date => ({
            date,
            records: grouped[date].sort((a, b) => (a.agent_name || '').localeCompare(b.agent_name || ''))
        }));
    }, [filteredSlaBreaches]);

    // Stat Cards calculations for filtered daily attendance
    const dailyStats = useMemo(() => {
        let morningIn = 0;
        let morningPending = 0;
        let eveningOut = 0;
        let eveningPending = 0;

        filteredAttendance.forEach(r => {
            // Count checked-in/out regardless of roster status (e.g. Worked on Week Off)
            if (r.morning_time) {
                morningIn++;
            } else if (r.morning_roster === 'DS' && !r.is_lop) {
                morningPending++;
            }

            if (r.evening_time) {
                eveningOut++;
            } else if (r.evening_roster === 'DS' && !r.is_lop) {
                eveningPending++;
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


    // SLA Breaches Severity Pie/Doughnut Chart Renderer
    const renderSlaSeverityPieChart = () => {
        let critical = 0, high = 0, moderate = 0;
        slaBreachesData.forEach(r => {
            if (r.total_breaches_this_month >= 4) critical++;
            else if (r.total_breaches_this_month === 3) high++;
            else moderate++;
        });

        const total = slaBreachesData.length;
        if (total === 0) return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No breach data available</p>;

        const entries = [
            { severity: 'critical', label: 'Critical (≥4)', count: critical, color: '#dc2626' },
            { severity: 'high', label: 'High Alert (3)', count: high, color: '#f97316' },
            { severity: 'moderate', label: 'Moderate (1-2)', count: moderate, color: '#eab308' },
        ].filter(e => e.count > 0).map(e => ({ ...e, percent: ((e.count / total) * 100).toFixed(1) }));

        let cumulativePercent = 0;
        const slices = entries.map((entry) => {
            const startPercent = cumulativePercent;
            cumulativePercent += entry.count / total;
            const endPercent = cumulativePercent;

            const startAngle = startPercent * 2 * Math.PI - Math.PI / 2;
            const endAngle = endPercent * 2 * Math.PI - Math.PI / 2;

            const cx = 100, cy = 100, rOuter = 82, rInner = 52;
            const x1 = cx + rOuter * Math.cos(startAngle);
            const y1 = cy + rOuter * Math.sin(startAngle);
            const x2 = cx + rOuter * Math.cos(endAngle);
            const y2 = cy + rOuter * Math.sin(endAngle);
            const x1In = cx + rInner * Math.cos(startAngle);
            const y1In = cy + rInner * Math.sin(startAngle);
            const x2In = cx + rInner * Math.cos(endAngle);
            const y2In = cy + rInner * Math.sin(endAngle);
            const largeArcFlag = (endPercent - startPercent) > 0.5 ? 1 : 0;

            let pathData;
            if (entries.length === 1) {
                pathData = `M 100 18 A 82 82 0 1 1 99.99 18 L 99.99 48 A 52 52 0 1 0 100 48 Z`;
            } else {
                pathData = [
                    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
                    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
                    `L ${x2In.toFixed(2)} ${y2In.toFixed(2)}`,
                    `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x1In.toFixed(2)} ${y1In.toFixed(2)}`,
                    'Z'
                ].join(' ');
            }

            return { ...entry, pathData };
        });

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {slices.map((slice, i) => {
                            const isHovered = hoveredSeveritySlice === i;
                            const isSelected = slaSeverityFilter === slice.severity;
                            return (
                                <path
                                    key={i}
                                    d={slice.pathData}
                                    fill={slice.color}
                                    stroke="var(--bg-card)"
                                    strokeWidth="2.5"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: isHovered || isSelected ? 'scale(1.06)' : 'scale(1)',
                                        transformOrigin: '100px 100px',
                                        filter: isHovered || isSelected ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.3))' : 'none',
                                        opacity: hoveredSeveritySlice !== null && !isHovered ? 0.45 : 1
                                    }}
                                    onMouseEnter={() => setHoveredSeveritySlice(i)}
                                    onMouseLeave={() => setHoveredSeveritySlice(null)}
                                    onClick={() => setSlaSeverityFilter(slaSeverityFilter === slice.severity ? 'all' : slice.severity)}
                                />
                            );
                        })}
                    </svg>
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none'
                    }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block', lineHeight: 1 }}>
                            {hoveredSeveritySlice !== null ? slices[hoveredSeveritySlice].count : total}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                            {hoveredSeveritySlice !== null ? slices[hoveredSeveritySlice].percent + '%' : 'Incidents'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '320px', maxWidth: '100%' }}>
                    {slices.map((slice, i) => {
                        const isSelected = slaSeverityFilter === slice.severity;
                        const isHovered = hoveredSeveritySlice === i;
                        return (
                            <div
                                key={i}
                                onMouseEnter={() => setHoveredSeveritySlice(i)}
                                onMouseLeave={() => setHoveredSeveritySlice(null)}
                                onClick={() => setSlaSeverityFilter(slaSeverityFilter === slice.severity ? 'all' : slice.severity)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.5rem 0.75rem', borderRadius: '6px',
                                    background: isSelected ? 'var(--bg-elevated)' : isHovered ? 'var(--bg-surface)' : 'transparent',
                                    border: isSelected ? `1px solid ${slice.color}` : '1px solid transparent',
                                    cursor: 'pointer', transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: slice.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{slice.label}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{slice.count}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({slice.percent}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

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
                <button
                    className={`manpower__tab-btn ${activeTab === 'lop-tracker' ? 'manpower__tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('lop-tracker')}
                >
                    LOP Tracker
                </button>
                <button
                    className={`manpower__tab-btn ${activeTab === 'sla-breaches' ? 'manpower__tab-btn--active' : ''}`}
                    onClick={() => setActiveTab('sla-breaches')}
                >
                    SLA Breaches
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
                    <div className="lop-tab-container" style={{ padding: '3rem 1rem', background: '#f3f4f6', minHeight: 'calc(100vh - 220px)', borderRadius: 'var(--radius-lg)' }}>
                        <div className="lop-tab" style={{ maxWidth: '440px', margin: '0 auto', background: '#ffffff', padding: '2.5rem 2.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                            <h2 style={{ marginBottom: '2rem', fontSize: '1.4rem', fontWeight: 600, color: '#000' }}>Mark Loss of Pay (LOP)</h2>
                            
                            {lopSuccess && (
                                <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--accent-emerald)' }}>
                                    LOP record submitted successfully!
                                </div>
                            )}
                            {lopError && (
                                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--accent-rose)' }}>
                                    {lopError}
                                </div>
                            )}

                            <form onSubmit={handleLopSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className="manpower__filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500, fontSize: '0.9rem', color: '#4b5563' }}>Email <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="email"
                                        value={lopFormData.email}
                                        onChange={(e) => setLopFormData({ ...lopFormData, email: e.target.value })}
                                        required
                                        style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.15s ease' }}
                                        onFocus={(e) => e.target.style.borderColor = '#eab308'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                </div>

                                <div className="manpower__filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500, fontSize: '0.9rem', color: '#4b5563' }}>Agent Name <span style={{ color: '#ef4444' }}>*</span></label>
                                    <CustomDropdown 
                                        options={LOP_AGENTS} 
                                        value={lopFormData.agentName} 
                                        onChange={(val) => setLopFormData({ ...lopFormData, agentName: val })} 
                                        placeholder="Choose" 
                                        searchable={true}
                                    />
                                </div>

                                <div className="manpower__filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500, fontSize: '0.9rem', color: '#4b5563' }}>Vertical Name <span style={{ color: '#ef4444' }}>*</span></label>
                                    <CustomDropdown 
                                        options={LOP_VERTICALS} 
                                        value={lopFormData.verticalName} 
                                        onChange={(val) => setLopFormData({ ...lopFormData, verticalName: val })} 
                                        placeholder="Choose" 
                                    />
                                </div>

                                <div className="manpower__filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontWeight: 500, fontSize: '0.9rem', color: '#4b5563' }}>Date of LOP <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="date"
                                        value={lopFormData.dateOfLop}
                                        onChange={(e) => setLopFormData({ ...lopFormData, dateOfLop: e.target.value })}
                                        required
                                        style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontSize: '0.95rem', outline: 'none' }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={lopSubmitting}
                                    style={{ marginTop: '1.5rem', padding: '0.85rem', fontSize: '1.05rem', fontWeight: 600, width: '100%', display: 'flex', justifyContent: 'center', background: '#eab308', color: '#000', border: 'none', borderRadius: '8px', cursor: lopSubmitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s ease' }}
                                    onMouseOver={(e) => { if (!lopSubmitting) e.target.style.background = '#ca8a04'; }}
                                    onMouseOut={(e) => { if (!lopSubmitting) e.target.style.background = '#eab308'; }}
                                >
                                    {lopSubmitting ? 'Submitting...' : 'Submit LOP'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Tab 5: LOP Tracker ── */}
                {activeTab === 'lop-tracker' && (
                    <div className="manpower__tab-content manpower__fade-in">
                        <div className="manpower__header" style={{ marginBottom: '1.5rem' }}>
                            <h1 className="manpower__title">LOP Tracker</h1>
                            <p className="manpower__subtitle">Loss of Pay records grouped by date</p>
                        </div>
                        
                        <div className="manpower__card" style={{ padding: '2rem' }}>
                            {lopTrackerData.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>No LOP records found.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {lopTrackerData.map(group => (
                                        <div key={group.date} style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                            <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '1.1rem' }}>{group.date}</span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', background: 'var(--bg-surface)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-primary)' }}>
                                                    {group.records.length} Record{group.records.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div style={{ padding: '0', overflowX: 'auto' }}>
                                                <table className="manpower__table" style={{ margin: 0, width: '100%' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ textAlign: 'left', padding: '1rem' }}>Agent Name</th>
                                                            <th style={{ textAlign: 'left', padding: '1rem' }}>Vertical Name</th>
                                                            <th style={{ textAlign: 'left', padding: '1rem' }}>Email</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.records.map((record, i) => (
                                                            <tr key={i} style={{ borderBottom: i < group.records.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                                                                <td style={{ fontWeight: 500, padding: '1rem' }}>{record.agent_name}</td>
                                                                <td style={{ padding: '1rem' }}>{record.vertical_name}</td>
                                                                <td style={{ color: 'var(--text-secondary)', padding: '1rem' }}>{record.email}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Tab 6: SLA Breaches ── */}
                {activeTab === 'sla-breaches' && (
                    <div className="manpower__tab-content manpower__fade-in">
                        <div className="manpower__header" style={{ marginBottom: '1.5rem' }}>
                            <div>
                                <h1 className="manpower__title">SLA Breaches</h1>
                                <p className="manpower__subtitle">Real-time SLA breach records & escalation metrics synchronized from ISD Manpower Hub.</p>
                            </div>
                        </div>

                        {/* KPI Stats Grid */}
                        <div className="manpower__stats-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="manpower__stat-card manpower__stat-card--evening-pending">
                                <span className="manpower__stat-card-title">Total Breaches</span>
                                <span className="manpower__stat-card-val text-rose">{slaStats.total}</span>
                                <span className="manpower__stat-card-sub">Recorded incidents</span>
                            </div>
                            <div className="manpower__stat-card manpower__stat-card--morning-pending">
                                <span className="manpower__stat-card-title">Unique Agents</span>
                                <span className="manpower__stat-card-val text-amber">{slaStats.uniqueAgents}</span>
                                <span className="manpower__stat-card-sub">With SLA breaches</span>
                            </div>
                            <div className="manpower__stat-card">
                                <span className="manpower__stat-card-title">Morning Check-In Missed</span>
                                <span className="manpower__stat-card-val text-rose">{slaStats.morningBreaches}</span>
                                <span className="manpower__stat-card-sub">No morning submission</span>
                            </div>
                            <div className="manpower__stat-card">
                                <span className="manpower__stat-card-title">Late Check-Ins</span>
                                <span className="manpower__stat-card-val text-amber">{slaStats.lateBreaches}</span>
                                <span className="manpower__stat-card-sub">Recorded past 11:00 AM</span>
                            </div>
                        </div>

                        {/* Single Interactive Pie Chart: Severity Distribution */}
                        <div className="manpower__card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    🎯 Monthly Breach Severity Distribution
                                </h3>
                                {slaSeverityFilter !== 'all' && (
                                    <button
                                        onClick={() => setSlaSeverityFilter('all')}
                                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                    >
                                        Reset Severity Filter
                                    </button>
                                )}
                            </div>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click any pie slice or legend item to filter incident records by repeat level</p>
                            {renderSlaSeverityPieChart()}
                        </div>

                        {/* High Repeat Breachers / Escalations Section */}
                        {repeatBreachers.length > 0 && (
                            <div className="manpower__card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ color: '#ef4444', fontSize: '1.2rem' }}>⚠️</span> High Repeat Breachers (Monthly Breaches ≥ 3)
                                    </h3>
                                    <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '12px', fontWeight: 600 }}>
                                        {repeatBreachers.length} Escalation Candidate{repeatBreachers.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                                    {repeatBreachers.map((agent, i) => (
                                        <div key={i} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{agent.agent_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{agent.email}</div>
                                            </div>
                                            <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '12px', flexShrink: 0 }}>
                                                {agent.max_breaches} Breaches
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Search & Filter Panel */}
                        <div className="manpower__filter-panel" style={{ marginBottom: '1.5rem' }}>
                            <div className="manpower__filter-group" style={{ flex: 1 }}>
                                <label className="manpower__filter-label">Search Agent or Email:</label>
                                <input
                                    type="text"
                                    className="manpower__select"
                                    placeholder="Type agent name, email, or reason..."
                                    value={slaSearchQuery}
                                    onChange={(e) => setSlaSearchQuery(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="manpower__filter-group" style={{ minWidth: '240px' }}>
                                <label className="manpower__filter-label">Breach Reason:</label>
                                <select
                                    className="manpower__select"
                                    value={slaReasonFilter}
                                    onChange={(e) => setSlaReasonFilter(e.target.value)}
                                >
                                    <option value="all">All Breach Reasons</option>
                                    {uniqueSlaReasons.map(reason => (
                                        <option key={reason} value={reason}>{reason}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="manpower__filter-group" style={{ minWidth: '180px' }}>
                                <label className="manpower__filter-label">Severity:</label>
                                <select
                                    className="manpower__select"
                                    value={slaSeverityFilter}
                                    onChange={(e) => setSlaSeverityFilter(e.target.value)}
                                >
                                    <option value="all">All Severity</option>
                                    <option value="critical">Critical (≥4)</option>
                                    <option value="high">High Alert (3)</option>
                                    <option value="moderate">Moderate (1-2)</option>
                                </select>
                            </div>
                            {(slaReasonFilter !== 'all' || slaSeverityFilter !== 'all' || slaSearchQuery) && (
                                <div className="manpower__filter-group" style={{ alignSelf: 'flex-end' }}>
                                    <button
                                        onClick={() => { setSlaReasonFilter('all'); setSlaSeverityFilter('all'); setSlaSearchQuery(''); }}
                                        style={{
                                            background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                                            color: 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '6px',
                                            fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ✕ Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Data Cards Grouped by Date */}
                        <div className="manpower__card" style={{ padding: '2rem' }}>
                            {groupedSlaBreaches.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '1.5rem 0' }}>No SLA Breach records found matching current filters.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {groupedSlaBreaches.map(group => (
                                        <div key={group.date} style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                            <div style={{ background: 'var(--bg-elevated)', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    📅 {group.date}
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'var(--bg-surface)', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-primary)' }}>
                                                    {group.records.length} Breach{group.records.length > 1 ? 'es' : ''}
                                                </span>
                                            </div>
                                            <div style={{ padding: '0', overflowX: 'auto' }}>
                                                <table className="manpower__table" style={{ margin: 0, width: '100%' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Agent Name</th>
                                                            <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Email</th>
                                                            <th style={{ textAlign: 'left', padding: '0.85rem 1rem' }}>Breach Reason</th>
                                                            <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Total Breaches This Month</th>
                                                            <th style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.records.map((record, i) => {
                                                            const isMorningMiss = (record.breach_reason || '').toLowerCase().includes('morning');
                                                            const isHighBreacher = record.total_breaches_this_month >= 3;
                                                            return (
                                                                <tr key={i} style={{ borderBottom: i < group.records.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                                                                    <td style={{ fontWeight: 600, padding: '0.85rem 1rem' }}>{record.agent_name}</td>
                                                                    <td style={{ color: 'var(--text-secondary)', padding: '0.85rem 1rem' }}>{record.email}</td>
                                                                    <td style={{ padding: '0.85rem 1rem' }}>
                                                                        <span style={{
                                                                            display: 'inline-block',
                                                                            padding: '0.2rem 0.65rem',
                                                                            borderRadius: '4px',
                                                                            fontSize: '0.825rem',
                                                                            fontWeight: 500,
                                                                            background: isMorningMiss ? '#fef2f2' : '#fffbe6',
                                                                            color: isMorningMiss ? '#991b1b' : '#92400e',
                                                                            border: isMorningMiss ? '1px solid #fecaca' : '1px solid #ffe58f'
                                                                        }}>
                                                                            {record.breach_reason}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>
                                                                        <span style={{
                                                                            fontWeight: 700,
                                                                            fontSize: '0.9rem',
                                                                            color: isHighBreacher ? '#ef4444' : 'var(--text-primary)'
                                                                        }}>
                                                                            {record.total_breaches_this_month}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>
                                                                        <span style={{
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 600,
                                                                            padding: '0.25rem 0.6rem',
                                                                            borderRadius: '12px',
                                                                            textTransform: 'uppercase',
                                                                            letterSpacing: '0.03em',
                                                                            background: isHighBreacher ? '#fee2e2' : '#fef3c7',
                                                                            color: isHighBreacher ? '#b91c1c' : '#b45309'
                                                                        }}>
                                                                            {isHighBreacher ? 'High Alert' : 'Warning'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
