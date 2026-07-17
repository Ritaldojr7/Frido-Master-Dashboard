import { describe, it, expect } from 'vitest';
import {
    transformManpowerData,
    aggregateLeaderboard,
    aggregateMonthlyAnalytics,
    getTodayIST,
    getWeekdayName,
    parseTimestampToIST
} from './manpowerData.js';

describe('Manpower Data Service Logic', () => {

    it('should correctly determine today in IST', () => {
        const todayStr = getTodayIST();
        expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should determine weekday names correctly', () => {
        expect(getWeekdayName('2026-07-17')).toBe('Fri');
        expect(getWeekdayName('2026-07-18')).toBe('Sat');
        expect(getWeekdayName('2026-07-19')).toBe('Sun');
    });

    it('should parse timestamps to IST safely regardless of timezone', () => {
        const parsed = parseTimestampToIST('Jun 30, 2026, 4:30:00 AM');
        expect(parsed.date).toBe('2026-06-30');
        expect(parsed.time).toBe('04:30 AM');

        const parsed2 = parseTimestampToIST('7/9/2026 13:39:42');
        expect(parsed2.date).toBe('2026-07-09');
        expect(parsed2.time).toBe('01:39 PM');
    });

    it('should transform manpower data, inject today in IST, and classify OFF/DS', () => {
        const sheetsData = {
            Roster: {
                rows: [
                    {
                        'Agent Name': 'Aayush Goyal',
                        'Official Email': 'aayush@myfrido.com',
                        'Vertical': 'Abandoned High Cart',
                        'Mon': 'DS',
                        'Tue': 'DS',
                        'Wed': 'DS',
                        'Thu': 'DS',
                        'Fri': 'DS',
                        'Sat': 'OFF',
                        'Sun': 'OFF'
                    },
                    {
                        'Agent Name': 'John Doe',
                        'Official Email': 'john@myfrido.com',
                        'Vertical': 'Abandoned Low Cart',
                        'Mon': 'DS',
                        'Tue': 'DS',
                        'Wed': 'DS',
                        'Thu': 'DS',
                        'Fri': 'DS',
                        'Sat': 'DS',
                        'Sun': 'DS'
                    }
                ]
            },
            Morning: {
                rows: [
                    {
                        'Employee Official Mail id': 'aayush@myfrido.com',
                        'Submitted By': 'Aayush Goyal',
                        'Timestamp': '2026-07-17 09:15:00'
                    }
                ]
            },
            Evening: {
                rows: [
                    {
                        'Official Mail Id': 'aayush@myfrido.com',
                        'Submitted By': 'Aayush Goyal',
                        'Timestamp': '2026-07-17 18:30:00',
                        'Total calls': '50',
                        'Total Sales': '25000',
                        'Last Lead Screen Capture': 'http://screenshot.url/1'
                    }
                ]
            },
            LOP: {
                rows: []
            }
        };

        const result = transformManpowerData(sheetsData);
        expect(result.attendance).toBeDefined();

        // Should include today (2026-07-17 is today in metadata, but we'll verify whatever day is returned contains today's date)
        const today = getTodayIST();
        const todayRecords = result.attendance.filter(r => r.date === today);
        expect(todayRecords.length).toBeGreaterThanOrEqual(1);

        // Check if Aayush Goyal has designation "Team Lead"
        const aayushToday = result.attendance.find(r => r.date === '2026-07-17' && r.email === 'aayush@myfrido.com');
        expect(aayushToday).toBeDefined();
        expect(aayushToday.designation).toBe('Team Lead');
        expect(aayushToday.morning_time).toBe('09:15 AM');
        expect(aayushToday.evening_time).toBe('06:30 PM');
        expect(aayushToday.total_calls).toBe(50);
        expect(aayushToday.total_sales).toBe(25000);
        expect(aayushToday.screenshot_url).toBe('http://screenshot.url/1');

        // Check if John Doe has designation "Executive"
        const johnToday = result.attendance.find(r => r.date === '2026-07-17' && r.email === 'john@myfrido.com');
        expect(johnToday).toBeDefined();
        expect(johnToday.designation).toBe('Executive');

        // Verify Sat and Sun are marked OFF for Aayush
        const aayushSat = result.attendance.find(r => r.date === '2026-07-18' && r.email === 'aayush@myfrido.com');
        if (aayushSat) {
            expect(aayushSat.morning_roster).toBe('OFF');
        }
    });

    it('should respect LOP precedence over other status and mark as LOP', () => {
        const sheetsData = {
            Roster: {
                rows: [
                    {
                        'Agent Name': 'Ankur Singh',
                        'Official Email': 'ankur@myfrido.com',
                        'Vertical': 'Abandoned High Cart',
                        'Mon': 'DS', 'Tue': 'DS', 'Wed': 'DS', 'Thu': 'DS', 'Fri': 'DS', 'Sat': 'DS', 'Sun': 'DS'
                    }
                ]
            },
            Morning: {
                rows: [
                    {
                        'Employee Official Mail id': 'ankur@myfrido.com',
                        'Submitted By': 'Ankur Singh',
                        'Timestamp': '2026-07-17 09:15:00'
                    }
                ]
            },
            Evening: {
                rows: []
            },
            LOP: {
                rows: [
                    {
                        'Agent Name ': 'Ankur Singh',
                        'email': 'ankur@myfrido.com',
                        '  Date of LOP  ': '2026-07-17'
                    }
                ]
            }
        };

        const result = transformManpowerData(sheetsData);
        const record = result.attendance.find(r => r.date === '2026-07-17' && r.email === 'ankur@myfrido.com');
        expect(record).toBeDefined();
        expect(record.is_lop).toBe(true);
    });

    it('should correctly aggregate leaderboard sorting/ranking, including zero Evening submissions cases', () => {
        const attendanceRecords = [
            {
                date: '2026-07-17',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                total_calls: 10,
                total_sales: 100,
                screenshot_url: 'url_a'
            },
            {
                date: '2026-07-17',
                agent_name: 'Agent B',
                email: 'b@myfrido.com',
                vertical: 'V1',
                total_calls: 20,
                total_sales: 50,
                screenshot_url: null
            },
            {
                date: '2026-07-17',
                agent_name: 'Agent C',
                email: 'c@myfrido.com',
                vertical: 'V2',
                total_calls: 0,
                total_sales: 0,
                screenshot_url: null
            }
        ];

        // Sort by calls
        const leaderboardCalls = aggregateLeaderboard(attendanceRecords, '2026-07-17', 'all', 'calls');
        expect(leaderboardCalls.rankedAgents[0].agent_name).toBe('Agent B'); // 20 calls
        expect(leaderboardCalls.rankedAgents[1].agent_name).toBe('Agent A'); // 10 calls
        expect(leaderboardCalls.rankedAgents[2].agent_name).toBe('Agent C'); // 0 calls

        // Sort by sales
        const leaderboardSales = aggregateLeaderboard(attendanceRecords, '2026-07-17', 'all', 'sales');
        expect(leaderboardSales.rankedAgents[0].agent_name).toBe('Agent A'); // 100 sales
        expect(leaderboardSales.rankedAgents[1].agent_name).toBe('Agent B'); // 50 sales
        expect(leaderboardSales.rankedAgents[2].agent_name).toBe('Agent C'); // 0 sales

        // Test vertical rollup
        const rollupV1 = leaderboardCalls.rollups.find(r => r.vertical === 'V1');
        expect(rollupV1).toBeDefined();
        expect(rollupV1.total_calls).toBe(30);
        expect(rollupV1.total_sales).toBe(150);
        expect(rollupV1.top_performer.agent_name).toBe('Agent B'); // sorted by calls
    });

    it('should aggregate monthly analytics (full/half/absent shifts) correctly', () => {
        const attendanceRecords = [
            // Case 1: Duty day, checked in and out -> Full Shift
            {
                date: '2026-07-01',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                morning_roster: 'DS',
                morning_time: '09:00 AM',
                evening_time: '06:00 PM',
                is_lop: false
            },
            // Case 2: Duty day, morning only -> Half Day
            {
                date: '2026-07-02',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                morning_roster: 'DS',
                morning_time: '09:00 AM',
                evening_time: null,
                is_lop: false
            },
            // Case 3: Duty day, absent -> Absence
            {
                date: '2026-07-03',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                morning_roster: 'DS',
                morning_time: null,
                evening_time: null,
                is_lop: false
            },
            // Case 4: LOP -> Absence
            {
                date: '2026-07-04',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                morning_roster: 'DS',
                morning_time: '09:00 AM',
                evening_time: '06:00 PM',
                is_lop: true
            },
            // Case 5: Week off -> doesn't count
            {
                date: '2026-07-05',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                morning_roster: 'OFF',
                morning_time: null,
                evening_time: null,
                is_lop: false
            }
        ];

        const analytics = aggregateMonthlyAnalytics(attendanceRecords, '2026-07');
        const agentA = analytics.find(a => a.email === 'a@myfrido.com');

        expect(agentA.fullShifts).toBe(1); // Only 2026-07-01
        expect(agentA.halfDays).toBe(1);   // Only 2026-07-02
        expect(agentA.absences).toBe(2);   // 2026-07-03 (no checkin/out) + 2026-07-04 (LOP)
    });

    it('should correctly filter aggregateLeaderboard using custom startDate and endDate', () => {
        const attendanceRecords = [
            {
                date: '2026-07-10',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                total_calls: 10,
                total_sales: 100,
                screenshot_url: null
            },
            {
                date: '2026-07-15',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                total_calls: 15,
                total_sales: 150,
                screenshot_url: null
            },
            {
                date: '2026-07-20',
                agent_name: 'Agent A',
                email: 'a@myfrido.com',
                vertical: 'V1',
                total_calls: 20,
                total_sales: 200,
                screenshot_url: null
            }
        ];

        // Fetch within range [2026-07-12, 2026-07-18] -> should only sum record on 2026-07-15
        const leaderboard = aggregateLeaderboard(attendanceRecords, null, 'V1', 'calls', '2026-07-12', '2026-07-18');
        expect(leaderboard.rankedAgents).toHaveLength(1);
        expect(leaderboard.rankedAgents[0].total_calls).toBe(15);
        expect(leaderboard.rankedAgents[0].total_sales).toBe(150);
    });
});
