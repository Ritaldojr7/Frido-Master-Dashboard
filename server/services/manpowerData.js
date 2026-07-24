export const TEAM_LEAD_NAMES = ["aayush goyal", "rishab de", "ankur singh", "dhanendra kumar"];
export const OFF_KEYWORDS = ["off", "wo", "week off", "weekoff"];

/**
 * Normalizes a string (email or name) for join/lookup comparison
 */
export function normalizeKey(str) {
    return String(str ?? '').trim().toLowerCase();
}

/**
 * Parses a Google Sheets date/time timestamp string safely into IST (UTC+5:30)
 */
export function parseTimestampToIST(timestampStr) {
    if (!timestampStr) return null;
    let clean = String(timestampStr).trim();
    if (!clean) return null;

    // Check if it has timezone (Z at the end, or +/-HH:MM or +/-HHMM at the end, or GMT/UTC)
    const hasTimezone = /Z$/i.test(clean) || /[+-]\d{2}:?\d{2}$/.test(clean) || /GMT|UTC/i.test(clean);
    let str = clean;
    if (!hasTimezone) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
            str = clean + 'T00:00:00+05:30';
        } else if (/^\d{4}-\d{2}-\d{2}\s+/.test(clean)) {
            str = clean.replace(/\s+/, 'T') + '+05:30';
        } else {
            const hasTime = /[:\s](am|pm)/i.test(clean) || clean.includes(':');
            if (hasTime) {
                str = clean + ' +05:30';
            } else {
                str = clean + ' 00:00:00 +05:30';
            }
        }
    }

    let d = new Date(str);
    if (isNaN(d.getTime())) {
        d = new Date(clean);
    }
    if (isNaN(d.getTime())) return null;

    const datePartFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return {
        date: datePartFormatter.format(d),
        time: timeFormatter.format(d),
        parsedDate: d
    };
}

/**
 * Helper to normalize any date input to YYYY-MM-DD
 */
export function normalizeDateStr(dateStr) {
    if (!dateStr) return null;
    const clean = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const parsed = parseTimestampToIST(clean);
    return parsed ? parsed.date : null;
}

/**
 * Get today's date string in IST (UTC+5:30)
 */
export function getTodayIST() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (3600000 * 5.5));
    const yyyy = ist.getFullYear();
    const mm = String(ist.getMonth() + 1).padStart(2, '0');
    const dd = String(ist.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get weekday name for a date string in YYYY-MM-DD
 */
export function getWeekdayName(dateStr) {
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const d = new Date(yyyy, mm - 1, dd, 12, 0, 0);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[d.getDay()];
}

/**
 * Parse sheets headers to check for case-insensitive matches
 */
function getVal(cleanRow, keys) {
    for (const k of keys) {
        if (cleanRow[k] !== undefined) return cleanRow[k];
    }
    return '';
}

/**
 * Normalize row object keys to trimmed lowercase
 */
function cleanRowKeys(row) {
    const clean = {};
    if (!row || typeof row !== 'object') return clean;
    for (const key of Object.keys(row)) {
        clean[key.trim().toLowerCase()] = String(row[key] ?? '').trim();
    }
    return clean;
}

/**
 * Pure transformation logic that processes sheet tabs data into the attendance model
 */
export function transformManpowerData(sheetsData) {
    const rosterTab = sheetsData?.Roster?.rows ?? [];
    const morningTab = sheetsData?.Morning?.rows ?? [];
    const eveningTab = sheetsData?.Evening?.rows ?? [];
    const lopTab = sheetsData?.LOP?.rows ?? [];

    const warnings = [];

    // 1. Process Roster (master employee list)
    const rosterAgents = rosterTab.map((row, index) => {
        const clean = cleanRowKeys(row);
        const name = getVal(clean, ['agent name', 'name']);
        const email = getVal(clean, ['official email', 'email']);
        const vertical = getVal(clean, ['vertical', 'vertical name']);

        if (!name) {
            warnings.push(`Roster row ${index + 2} has empty agent name`);
        }

        const rosterDays = {};
        ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
            const rawStatus = clean[day] ?? 'ds';
            const isOff = OFF_KEYWORDS.includes(rawStatus.toLowerCase());
            rosterDays[day] = isOff ? 'OFF' : 'DS';
        });

        return {
            name: normalizeKey(name),
            email: normalizeKey(email),
            originalName: name || 'Unknown Agent',
            originalEmail: email || 'unknown@myfrido.com',
            vertical: vertical || 'General',
            roster: rosterDays
        };
    }).filter(agent => agent.name || agent.email);

    // 2. Parse LOP rows
    const lopRecords = lopTab.map((row, index) => {
        const clean = cleanRowKeys(row);
        const name = getVal(clean, ['agent name']);
        const dateRaw = getVal(clean, ['date of lop']);
        const date = normalizeDateStr(dateRaw);
        const email = getVal(clean, ['email address', 'email']);

        if (!date) {
            warnings.push(`LOP row ${index + 2} has unparseable date: "${dateRaw}"`);
        }

        return {
            name: normalizeKey(name),
            email: normalizeKey(email),
            date
        };
    }).filter(record => record.date && (record.name || record.email));

    // 3. Parse Morning check-ins
    const morningRecords = morningTab.map((row, index) => {
        const clean = cleanRowKeys(row);
        const email = getVal(clean, ['employee official mail id', 'official mail id', 'email']);
        const name = getVal(clean, ['submitted by', 'agent name']);
        const timestampRaw = getVal(clean, ['timestamp']);
        const parsed = parseTimestampToIST(timestampRaw);

        if (!parsed) {
            warnings.push(`Morning row ${index + 2} has unparseable timestamp: "${timestampRaw}"`);
            return null;
        }

        return {
            email: normalizeKey(email),
            name: normalizeKey(name),
            date: parsed.date,
            time: parsed.time,
            timestamp: parsed.parsedDate.getTime()
        };
    }).filter(Boolean);

    // 4. Parse Evening checkouts + metrics
    const eveningRecords = eveningTab.map((row, index) => {
        const clean = cleanRowKeys(row);
        const email = getVal(clean, ['official mail id', 'employee official mail id', 'email']);
        const name = getVal(clean, ['submitted by', 'agent name']);
        const timestampRaw = getVal(clean, ['timestamp']);
        const parsed = parseTimestampToIST(timestampRaw);

        if (!parsed) {
            warnings.push(`Evening row ${index + 2} has unparseable timestamp: "${timestampRaw}"`);
            return null;
        }

        const callsRaw = getVal(clean, ['total calls']);
        const salesRaw = getVal(clean, ['total sales']);
        const screenshot = getVal(clean, ['last lead screen capture', 'attachment']);

        const calls = parseInt(callsRaw, 10);
        const sales = parseFloat(salesRaw);

        return {
            email: normalizeKey(email),
            name: normalizeKey(name),
            date: parsed.date,
            time: parsed.time,
            timestamp: parsed.parsedDate.getTime(),
            calls: isNaN(calls) ? 0 : calls,
            sales: isNaN(sales) ? 0 : sales,
            screenshotUrl: screenshot || null
        };
    }).filter(Boolean);

    // 5. Gather all dates across Morning, Evening and today IST
    const datesSet = new Set();
    morningRecords.forEach(r => datesSet.add(r.date));
    eveningRecords.forEach(r => datesSet.add(r.date));
    datesSet.add(getTodayIST());
    const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

    // Helper map to lookup records quickly
    const getAgentMatch = (agent, records, date) => {
        const list = records.filter(r => r.date === date);
        // Match by email first
        let matches = list.filter(r => r.email && r.email === agent.email);
        if (matches.length === 0) {
            // Fallback to name match
            matches = list.filter(r => r.name && r.name === agent.name);
        }
        return matches;
    };

    // 6. Build date × agent attendance grid
    const attendance = [];

    for (const date of sortedDates) {
        const dayOfWeek = getWeekdayName(date).toLowerCase();

        for (const agent of rosterAgents) {
            // Find check-in (Morning)
            const mornings = getAgentMatch(agent, morningRecords, date);
            // Earliest check-in
            const morningMatch = mornings.length > 0
                ? mornings.reduce((earliest, cur) => cur.timestamp < earliest.timestamp ? cur : earliest)
                : null;

            // Find checkout + performance metrics (Evening)
            const evenings = getAgentMatch(agent, eveningRecords, date);
            // Latest checkout, but SUM total calls/sales
            const eveningMatch = evenings.length > 0
                ? evenings.reduce((latest, cur) => cur.timestamp > latest.timestamp ? cur : latest)
                : null;

            const total_calls = evenings.reduce((sum, cur) => sum + cur.calls, 0);
            const total_sales = evenings.reduce((sum, cur) => sum + cur.sales, 0);

            // Check if LOP
            const is_lop = lopRecords.some(r => {
                if (r.date !== date) return false;
                if (r.email && r.email === agent.email) return true;
                if (r.name && r.name === agent.name) return true;
                return false;
            });

            // Determine designation
            const designation = TEAM_LEAD_NAMES.includes(agent.name) ? 'Team Lead' : 'Executive';

            // Roster status for this day
            const rosterStatus = agent.roster[dayOfWeek] ?? 'DS';

            attendance.push({
                date,
                agent_name: agent.originalName,
                email: agent.originalEmail,
                designation,
                vertical: agent.vertical,
                morning_time: morningMatch ? morningMatch.time : null,
                evening_time: eveningMatch ? eveningMatch.time : null,
                morning_roster: rosterStatus,
                evening_roster: rosterStatus,
                is_lop,
                total_calls,
                total_sales,
                screenshot_url: eveningMatch ? eveningMatch.screenshotUrl : null
            });
        }
    }

    // 5. Parse SLA Breaches rows
    const slaBreachesTab = sheetsData?.['SLA Breaches']?.rows ?? [];
    const slaBreaches = parseSlaBreaches(slaBreachesTab, warnings);

    return {
        attendance,
        slaBreaches,
        warnings
    };
}

export function parseSlaBreaches(slaBreachesTab = [], warnings = []) {
    return (slaBreachesTab || []).map((row, index) => {
        const clean = cleanRowKeys(row);
        const dateRaw = getVal(clean, ['date']);
        const date = normalizeDateStr(dateRaw) || dateRaw;
        const agentName = getVal(clean, ['agent name', 'name']);
        const email = getVal(clean, ['email', 'email address']);
        const breachReason = getVal(clean, ['breach reason', 'reason']);
        const totalBreachesThisMonth = parseInt(getVal(clean, ['total breaches this month', 'total breaches']), 10) || 0;

        if (!agentName && !email && !breachReason) return null;

        return {
            date: date || '',
            agent_name: agentName || 'Unknown Agent',
            email: email || '',
            breach_reason: breachReason || '',
            total_breaches_this_month: totalBreachesThisMonth
        };
    }).filter(Boolean);
}

export function aggregateLeaderboard(attendanceRecords, period, verticalFilter, sortBy, startDate = null, endDate = null) {
    const isAllVerticals = !verticalFilter || verticalFilter.toLowerCase() === 'all';

    const filterByDate = (r) => {
        if (startDate && endDate) {
            return r.date >= startDate && r.date <= endDate;
        }
        if (period) {
            const isMonth = period.length === 7; // YYYY-MM vs YYYY-MM-DD
            return isMonth ? r.date.startsWith(period) : r.date === period;
        }
        return true;
    };

    // 1. Filter attendance records by period and vertical
    const filteredRecords = attendanceRecords.filter(r => {
        const matchesPeriod = filterByDate(r);
        const matchesVertical = isAllVerticals || normalizeKey(r.vertical) === normalizeKey(verticalFilter);
        return matchesPeriod && matchesVertical;
    });

    // 2. Group by agent (name + email + vertical)
    const agentMap = {};
    filteredRecords.forEach(r => {
        const key = `${normalizeKey(r.agent_name)}|${normalizeKey(r.email)}`;
        if (!agentMap[key]) {
            agentMap[key] = {
                agent_name: r.agent_name,
                email: r.email,
                vertical: r.vertical,
                total_calls: 0,
                total_sales: 0,
                screenshot_url: null
            };
        }
        agentMap[key].total_calls += r.total_calls;
        agentMap[key].total_sales += r.total_sales;
        // Keep screenshot if exists
        if (r.screenshot_url) {
            agentMap[key].screenshot_url = r.screenshot_url;
        }
    });

    const agentsList = Object.values(agentMap);

    // 3. Sort helper
    const sortFn = (a, b) => {
        if (sortBy === 'sales') {
            if (b.total_sales !== a.total_sales) {
                return b.total_sales - a.total_sales;
            }
            return b.total_calls - a.total_calls;
        } else {
            if (b.total_calls !== a.total_calls) {
                return b.total_calls - a.total_calls;
            }
            return b.total_sales - a.total_sales;
        }
    };

    // Rank agents globally (within filtered set)
    agentsList.sort(sortFn);
    const rankedAgents = agentsList.map((agent, i) => ({
        rank: i + 1,
        ...agent
    }));

    // 4. Vertical rollups (Group all matching records by Vertical Name)
    const verticalGroupRecords = attendanceRecords.filter(r => {
        return filterByDate(r);
    });

    const verticalRollupMap = {};
    verticalGroupRecords.forEach(r => {
        const vKey = r.vertical;
        if (!verticalRollupMap[vKey]) {
            verticalRollupMap[vKey] = {
                vertical: vKey,
                total_calls: 0,
                total_sales: 0,
                agents: {}
            };
        }
        
        verticalRollupMap[vKey].total_calls += r.total_calls;
        verticalRollupMap[vKey].total_sales += r.total_sales;

        const aKey = `${normalizeKey(r.agent_name)}|${normalizeKey(r.email)}`;
        if (!verticalRollupMap[vKey].agents[aKey]) {
            verticalRollupMap[vKey].agents[aKey] = {
                agent_name: r.agent_name,
                email: r.email,
                total_calls: 0,
                total_sales: 0,
                screenshot_url: r.screenshot_url
            };
        }
        verticalRollupMap[vKey].agents[aKey].total_calls += r.total_calls;
        verticalRollupMap[vKey].agents[aKey].total_sales += r.total_sales;
        if (r.screenshot_url) {
            verticalRollupMap[vKey].agents[aKey].screenshot_url = r.screenshot_url;
        }
    });

    const rollups = Object.values(verticalRollupMap).map(vInfo => {
        const agentsInVertical = Object.values(vInfo.agents);
        agentsInVertical.sort(sortFn);
        const topPerformer = agentsInVertical[0] || null;

        return {
            vertical: vInfo.vertical,
            total_calls: vInfo.total_calls,
            total_sales: vInfo.total_sales,
            top_performer: topPerformer ? {
                agent_name: topPerformer.agent_name,
                email: topPerformer.email,
                total_calls: topPerformer.total_calls,
                total_sales: topPerformer.total_sales,
                screenshot_url: topPerformer.screenshot_url
            } : null
        };
    });

    return {
        rankedAgents,
        rollups
    };
}

/**
 * Aggregates monthly analytics: Full shifts, Half days, Absences per employee
 */
export function aggregateMonthlyAnalytics(attendanceRecords, monthStr) {
    const filtered = attendanceRecords.filter(r => r.date.startsWith(monthStr));

    const employeeMap = {};
    filtered.forEach(r => {
        const key = `${normalizeKey(r.agent_name)}|${normalizeKey(r.email)}`;
        if (!employeeMap[key]) {
            employeeMap[key] = {
                agent_name: r.agent_name,
                email: r.email,
                vertical: r.vertical,
                fullShifts: 0,
                halfDays: 0,
                absences: 0
            };
        }

        const stats = employeeMap[key];

        if (r.is_lop) {
            stats.absences += 1;
        } else if (r.morning_roster === 'OFF') {
            // Week off, doesn't count towards regular metrics unless they worked
            // Let's check if they worked on week-off
            if (r.morning_time !== null && r.evening_time !== null) {
                // Completed Shift on Week off
                stats.fullShifts += 1;
            } else if (r.morning_time !== null || r.evening_time !== null) {
                // Worked half shift
                stats.halfDays += 1;
            }
        } else {
            // Duty shift
            if (r.morning_time !== null && r.evening_time !== null) {
                stats.fullShifts += 1;
            } else if (r.morning_time !== null || r.evening_time !== null) {
                stats.halfDays += 1;
            } else {
                stats.absences += 1;
            }
        }
    });

    return Object.values(employeeMap);
}
