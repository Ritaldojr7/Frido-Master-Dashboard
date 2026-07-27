/**
 * Auth routes — now handled by Clerk.
 *
 * Login, forgot-password, reset-password, and accept-invite flows
 * are all managed by Clerk's hosted/embedded UI. This router is kept
 * as a placeholder in case you need to add custom auth-adjacent endpoints.
 */
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { normalizeEmail, isAllowedCompanyEmail, resolveRoleToValidSlug, VALID_ROLES } from '../utils/security.js';
import { sendGraphMail } from '../services/graphEmail.js';
import { clerkClient } from '../services/userInvite.js';

const router = Router();

/**
 * GET /api/auth/status — simple check that auth service is configured
 */
router.get('/status', (_req, res) => {
    res.json({
        provider: 'clerk',
        message: 'Authentication is managed by Clerk. Use the Clerk UI to sign in.',
    });
});

/**
 * POST /api/auth/request-access — guest request dashboard credentials
 */
router.post('/request-access', async (req, res) => {
    try {
        const { name, email, designation, department, role } = req.body;
        
        if (!name || !email || !designation || !department || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail.endsWith('@myfrido.com') || !isAllowedCompanyEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Only emails ending with @myfrido.com are allowed to request access.' });
        }

        const roleSlug = resolveRoleToValidSlug(role) ?? (VALID_ROLES.includes(String(role)) ? String(role) : null);
        if (!roleSlug) {
            return res.status(400).json({ error: 'Invalid role selection.' });
        }

        // Check if already registered and active in users & Clerk
        const existingUser = await db.get('SELECT id, status FROM users WHERE email = ? AND deleted_at IS NULL', [normalizedEmail]);
        if (existingUser) {
            let existsInClerk = false;
            try {
                const { data } = await clerkClient.users.getUserList({ emailAddress: [normalizedEmail] });
                if (data && data.length > 0) {
                    existsInClerk = true;
                }
            } catch (clerkErr) {
                console.warn('[auth] Clerk user check failed:', clerkErr.message);
            }

            if (existingUser.status === 'active' && existsInClerk) {
                return res.status(400).json({ error: 'This email is already registered and active. Please sign in.' });
            }
        }

        // Check if there is already an access request for this email
        const existingRequest = await db.get('SELECT id, status FROM access_requests WHERE email = ?', [normalizedEmail]);
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return res.status(400).json({ error: 'A pending access request already exists for this email.' });
            }
            // Overwrite existing non-pending (e.g. rejected) request with new request details
            const nowIso = new Date().toISOString();
            await db.run(
                `UPDATE access_requests
                 SET name = ?, designation = ?, department = ?, role = ?, status = 'pending', reviewed_by = '', updated_at = ?
                 WHERE email = ?`,
                [name.trim(), designation.trim(), department.trim(), roleSlug, nowIso, normalizedEmail]
            );
        } else {
            const id = uuid();
            const nowIso = new Date().toISOString();
            await db.run(
                `INSERT INTO access_requests (id, email, name, designation, department, role, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, normalizedEmail, name.trim(), designation.trim(), department.trim(), roleSlug, 'pending', nowIso, nowIso]
            );
        }

        // Send email to admin
        try {
            const notifyEmail = String(
                process.env.DEFAULT_ADMIN_EMAIL ?? process.env.ACCESS_REQUEST_NOTIFY_EMAIL ?? ''
            ).trim();
            if (!notifyEmail) {
                console.warn('Access request received but no DEFAULT_ADMIN_EMAIL or ACCESS_REQUEST_NOTIFY_EMAIL configured.');
            } else {
            const html = `
                <h2>New Access Request</h2>
                <p>A user has requested access to the Frido Master Dashboard:</p>
                <ul>
                    <li><strong>Name:</strong> ${name.trim()}</li>
                    <li><strong>Email:</strong> ${normalizedEmail}</li>
                    <li><strong>Designation:</strong> ${designation.trim()}</li>
                    <li><strong>Department:</strong> ${department.trim()}</li>
                    <li><strong>Requested Role:</strong> ${role}</li>
                </ul>
                <p>Please log in to the admin dashboard to review this request.</p>
            `;
            await sendGraphMail({
                toEmail: notifyEmail,
                toName: 'Dashboard Admin',
                subject: `New Dashboard Access Request from ${name.trim()}`,
                html,
            });
            }
        } catch (emailErr) {
            console.error('Failed to send admin notification email:', emailErr);
        }

        res.json({ message: 'Access request submitted successfully.' });
    } catch (err) {
        console.error('Request access error:', err);
        res.status(500).json({ error: 'Internal server error while processing access request.' });
    }
});

export default router;

