import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /api/config/organization', () => {
    it('returns runtime org config from env', async () => {
        process.env.VITE_ISD_DASHBOARD_EMAILS = 'alice@test.myfrido.com,bob@test.myfrido.com';
        process.env.VITE_SALARY_ANALYSIS_EMAILS = 'alice@test.myfrido.com';

        const app = createApp();
        const res = await request(app).get('/api/config/organization');

        expect(res.status).toBe(200);
        expect(res.body.isdDashboardEmails).toEqual(['alice@test.myfrido.com', 'bob@test.myfrido.com']);
        expect(res.body.salaryAnalysisEmails).toEqual(['alice@test.myfrido.com']);
    });
});
