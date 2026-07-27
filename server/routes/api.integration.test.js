/**
 * Integration tests for core API routes.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import db, { now } from '../db.js';
import { createApp } from '../app.js';

describe('API integration', () => {
    let app;

    beforeAll(async () => {
        process.env.VITE_DEMO_MODE = 'true';
        process.env.VITE_DEMO_ROLE = 'admin';
        process.env.VITE_DEMO_USER_EMAIL = 'demo@myfrido.com';
        process.env.VITE_DEMO_USER_NAME = 'Demo User';
        process.env.NODE_ENV = 'test';

        const ts = now();
        await db.run(
            `INSERT OR REPLACE INTO users (id, email, name, role, roles, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'demo-staff',
                'demo@myfrido.com',
                'Demo User',
                'admin',
                JSON.stringify(['admin']),
                'active',
                ts,
                ts,
            ]
        );

        app = createApp();
    });

    it('GET /api/health returns ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('frido-dashboard-api');
    });

    it('GET /api/users/me returns the authenticated demo profile', async () => {
        const res = await request(app).get('/api/users/me');
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('demo@myfrido.com');
        expect(res.body.user.role).toBe('admin');
    });

    it('GET /api/manpower returns attendance payload for authorized roles', async () => {
        const res = await request(app).get('/api/manpower');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('attendance');
        expect(Array.isArray(res.body.attendance)).toBe(true);
    });

    it('POST /api/auth/request-access succeeds with new roles like feedback_head and td_head', async () => {
        await db.run('DELETE FROM access_requests WHERE email = ?', ['candidate.test@myfrido.com']);
        const res = await request(app)
            .post('/api/auth/request-access')
            .send({
                name: 'Test Candidate',
                email: 'candidate.test@myfrido.com',
                designation: 'Feedback Specialist',
                department: 'Feedback',
                role: 'feedback_head',
            });
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Access request submitted successfully');

        // Verify inserted row in access_requests table
        const reqRow = await db.get('SELECT * FROM access_requests WHERE email = ?', ['candidate.test@myfrido.com']);
        expect(reqRow).toBeDefined();
        expect(reqRow.role).toBe('feedback_head');
        expect(reqRow.status).toBe('pending');
    });

    it('POST /api/auth/request-access allows resubmission if previous request was rejected', async () => {
        // Mark previous request as rejected by an admin
        await db.run("UPDATE access_requests SET status = 'rejected', reviewed_by = 'admin@myfrido.com' WHERE email = ?", ['candidate.test@myfrido.com']);

        // Resubmit request with a new role
        const res = await request(app)
            .post('/api/auth/request-access')
            .send({
                name: 'Test Candidate Updated',
                email: 'candidate.test@myfrido.com',
                designation: 'T&D Manager',
                department: 'Training',
                role: 'td_head',
            });
        expect(res.status).toBe(200);

        const updatedRow = await db.get('SELECT * FROM access_requests WHERE email = ?', ['candidate.test@myfrido.com']);
        expect(updatedRow.status).toBe('pending');
        expect(updatedRow.role).toBe('td_head');
        expect(updatedRow.designation).toBe('T&D Manager');
        expect(updatedRow.reviewed_by).toBe('');
    });
});
