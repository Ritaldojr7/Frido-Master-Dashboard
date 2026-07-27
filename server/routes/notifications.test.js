import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import db from '../db.js';
import { createNotification, listNotifications } from '../services/notificationService.js';

describe('Notifications API & Service', () => {
    const app = createApp();

    beforeEach(async () => {
        await db.run('DELETE FROM dashboard_notifications');
    });

    it('creates and lists notifications correctly via notificationService', async () => {
        const notif = await createNotification({
            type: 'upload',
            title: 'Test Upload',
            message: 'Inventory snapshot test.xlsx uploaded',
            actorEmail: 'admin@myfrido.com',
            actorName: 'Admin User',
            metadata: { fileName: 'test.xlsx' },
        });

        expect(notif).toBeDefined();
        expect(notif.id).toBeDefined();

        const list = await listNotifications({ limit: 10 });
        expect(list.total).toBe(1);
        expect(list.notifications).toHaveLength(1);
        expect(list.notifications[0].title).toBe('Test Upload');
        expect(list.notifications[0].type).toBe('upload');
        expect(list.notifications[0].actor_email).toBe('admin@myfrido.com');
    });

    it('filters notifications by type', async () => {
        await createNotification({ type: 'upload', title: 'File Upload', message: 'Uploaded file', actorEmail: 'admin@myfrido.com' });
        await createNotification({ type: 'access_request', title: 'Access Request', message: 'Requested access', actorEmail: 'user@myfrido.com' });
        await createNotification({ type: 'user_login', title: 'Login', message: 'User logged in', actorEmail: 'user@myfrido.com' });

        const uploadsOnly = await listNotifications({ type: 'upload' });
        expect(uploadsOnly.total).toBe(1);
        expect(uploadsOnly.notifications[0].type).toBe('upload');

        const requestsOnly = await listNotifications({ type: 'access_request' });
        expect(requestsOnly.total).toBe(1);
        expect(requestsOnly.notifications[0].type).toBe('access_request');

        const loginsOnly = await listNotifications({ type: 'user_login' });
        expect(loginsOnly.total).toBe(1);
        expect(loginsOnly.notifications[0].type).toBe('user_login');
    });

    it('GET /api/notifications rejects unauthenticated requests with 401/403', async () => {
        const res = await request(app).get('/api/notifications');
        expect([401, 403]).toContain(res.status);
    });
});
