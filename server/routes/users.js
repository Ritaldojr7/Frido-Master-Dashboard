/**
 * User routes — profile CRUD, admin user management, invitations
 * Auth is handled by Clerk; passwords are managed externally.
 */
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { sendInviteEmail } from '../services/email.js';
import { createClerkClient } from '@clerk/express';
import {
    isAllowedCompanyEmail,
    normalizeEmail,
    normalizeRole,
    VALID_ROLES,
} from '../utils/security.js';

const router = Router();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Merge role into Clerk publicMetadata. Invite rows often use placeholder UUID ids;
 * Clerk only recognizes real ids (`user_…`), so fall back to lookup by email.
 */
async function syncClerkPublicRole({ dbUserId, email }, role) {
    const mergeMd = async (clerkUserId, prevMd) => {
        await clerkClient.users.updateUserMetadata(clerkUserId, {
            publicMetadata: { ...(prevMd || {}), role },
        });
    };

    const emailNorm = normalizeEmail(email);

    if (typeof dbUserId === 'string' && dbUserId.startsWith('user_')) {
        try {
            const u = await clerkClient.users.getUser(dbUserId);
            await mergeMd(dbUserId, u.publicMetadata);
            return;
        } catch (err) {
            console.warn('[users] Clerk role sync by id failed, trying email:', err.message);
        }
    }

    if (!emailNorm) return;

    const { data: list } = await clerkClient.users.getUserList({
        emailAddress: [emailNorm],
        limit: 10,
    });
    const clerkUser = list?.[0];
    if (!clerkUser) {
        console.warn('[users] No Clerk user for email — metadata sync skipped:', emailNorm);
        return;
    }
    await mergeMd(clerkUser.id, clerkUser.publicMetadata);
}

// All routes require authentication
router.use(verifyToken);

// ── Current User Profile ────────────────────────────────

/**
 * GET /api/users/me — Get current user profile
 */
router.get('/me', async (req, res) => {
    const user = await db.get(
        'SELECT id, email, name, role, department, store_name, avatar_url, status, last_login, created_at FROM users WHERE id = ?',
        [req.user.id]
    );

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
});

/**
 * PUT /api/users/me — Update current user profile
 * Body: { name?, department?, avatar_url? }
 */
router.put('/me', async (req, res) => {
    const { name, department, store_name, avatar_url } = req.body;

    const updates = [];
    const values = [];
    const publicMetadata = {};

    if (name !== undefined) {
        const trimmed = String(name).trim();
        if (!trimmed) return res.status(400).json({ error: 'Name cannot be empty' });
        updates.push('name = ?');
        values.push(trimmed);
    }
    if (department !== undefined) {
        updates.push('department = ?');
        values.push(department == null ? '' : String(department).trim());
        publicMetadata.department = department == null ? '' : String(department).trim();
    }
    if (store_name !== undefined) {
        updates.push('store_name = ?');
        values.push(store_name == null ? '' : String(store_name).trim());
        publicMetadata.store_name = store_name == null ? '' : String(store_name).trim();
    }
    if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        values.push(avatar_url);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    // Sync with Clerk if metadata changed
    if (Object.keys(publicMetadata).length > 0) {
        try {
            await clerkClient.users.updateUserMetadata(req.user.id, {
                publicMetadata
            });
        } catch (err) {
            console.error('Clerk metadata sync failed:', err);
            // Non-blocking but good to know
        }
    }

    updates.push('updated_at = ?');
    values.push(now());
    values.push(req.user.id);

    await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const user = await db.get(
        'SELECT id, email, name, role, department, store_name, avatar_url, status, last_login, created_at FROM users WHERE id = ?',
        [req.user.id]
    );

    res.json({ user });
});

// ── Admin: User Management ──────────────────────────────

/**
 * GET /api/users — List all users (admin only)
 */
router.get('/', requireRole(['admin']), async (_req, res) => {
    const users = await db.all(
        `SELECT id, email, name, role, department, store_name, avatar_url, status, last_login, created_at, deleted_at
         FROM users
         ORDER BY (deleted_at IS NOT NULL), created_at DESC`
    );

    res.json({ users });
});

/**
 * POST /api/users/invite — Invite a new user (admin only)
 * Body: { email, name, role }
 */
router.post('/invite', requireRole(['admin']), async (req, res) => {
    try {
        const { email, name, role } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }

        if (!isAllowedCompanyEmail(normalizedEmail)) {
            return res.status(403).json({ error: 'Only approved company email domains can be invited.' });
        }

        const userRole = normalizeRole(role);
        
        // Determine the correct redirect URL (ngrok from env, or fallback to request origin)
        const origin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:4000';

        // Check if user already exists in SQLite
        const existing = await db.get(
            'SELECT id, deleted_at FROM users WHERE email = ?',
            [normalizedEmail]
        );
        if (existing && !existing.deleted_at) {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }
        if (existing?.deleted_at) {
            await db.run('DELETE FROM users WHERE id = ?', [existing.id]);
        }

        // 1. Create invitation in Clerk
        // We use ignorePolicies to bypass Clerk's default email so we can send our own MS Graph email.
        // We also use notify: false because we are handling the notification.
        let invitation = null;
        let existingClerkUser = null;

        try {
            invitation = await clerkClient.invitations.createInvitation({
                emailAddress: normalizedEmail,
                publicMetadata: { 
                    role: userRole,
                    store_name: req.body.store_name || '' 
                },
                redirectUrl: origin,
                notify: false,
                ignorePolicies: true,
            });
        } catch (clerkErr) {
            const errorCode = clerkErr.errors?.[0]?.code;
            
            if (errorCode === 'form_identifier_exists') {
                // User already has an account! Just update their role.
                const { data: users } = await clerkClient.users.getUserList({ emailAddress: [normalizedEmail] });
                if (users && users.length > 0) {
                    existingClerkUser = users[0];
                    await clerkClient.users.updateUserMetadata(existingClerkUser.id, {
                        publicMetadata: { role: userRole }
                    });
                } else {
                    return res.status(500).json({ error: 'User exists but could not be retrieved from Clerk.' });
                }
            } else if (errorCode === 'duplicate_record') {
                // Invitation already exists, revoke it and create a fresh one
                try {
                    const { data: invites } = await clerkClient.invitations.getInvitationList({ status: 'pending' });
                    const existingInvite = invites.find(i => i.emailAddress === normalizedEmail);
                    if (existingInvite) {
                        await clerkClient.invitations.revokeInvitation(existingInvite.id);
                        invitation = await clerkClient.invitations.createInvitation({
                            emailAddress: normalizedEmail,
                            publicMetadata: { role: userRole },
                            redirectUrl: origin,
                            notify: false,
                            ignorePolicies: true,
                        });
                    }
                } catch (retryErr) {
                    console.error('Failed to recreate invitation:', retryErr);
                    return res.status(500).json({ error: 'An invitation already exists and could not be recreated.' });
                }
            } else {
                console.error('Clerk invitation error:', clerkErr);
                return res.status(500).json({ error: clerkErr.errors?.[0]?.message || 'Failed to create invitation in Clerk' });
            }
        }

        // Extract the raw ticket from Clerk's URL and redirect to our custom frontend Sign Up page
        let inviteLink = origin || 'http://localhost:3000';
        if (invitation && invitation.url) {
            try {
                const urlObj = new URL(invitation.url);
                const ticket = urlObj.searchParams.get('ticket') || urlObj.searchParams.get('__clerk_ticket');
                if (ticket) {
                    inviteLink = `${origin}/#/sign-up?__clerk_ticket=${ticket}`;
                } else {
                    inviteLink = invitation.url; // fallback
                }
            } catch {
                inviteLink = invitation.url;
            }
        }
        
        // 2. Insert placeholder into SQLite so they appear in the Admin table
        const id = existingClerkUser ? existingClerkUser.id : uuid(); // Use real ID if they already exist
        await db.run(
            `INSERT INTO users (id, email, name, password_hash, role, store_name, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, normalizedEmail, name.trim(), '', userRole, req.body.store_name || '', 'invited', now(), now()]
        );

        // 3. Send the custom MS Graph email
        const inviter = await db.get(
            'SELECT name, email FROM users WHERE id = ?',
            [req.user.id]
        );

        let emailWarning = null;
        try {
            const result = await sendInviteEmail({
                toEmail: normalizedEmail,
                toName: name.trim(),
                inviteLink,
                inviterName: inviter?.name || 'A Frido administrator',
                inviterEmail: inviter?.email || '',
                role: userRole,
            });
            if (result?.status === 'logged') {
                emailWarning = 'Email service not configured — share the invite link manually.';
            }
        } catch (mailErr) {
            console.error('Invite email failed:', mailErr);
            emailWarning = `Couldn't send the email (${mailErr.message}). Share the invite link below manually.`;
        }

        const user = await db.get(
            'SELECT id, email, name, role, department, store_name, status, created_at FROM users WHERE id = ?',
            [id]
        );

        res.status(201).json({
            user,
            message: emailWarning ? 'Invitation created' : 'Invitation sent successfully',
            warning: emailWarning,
            inviteLink: emailWarning ? inviteLink : undefined,
        });
    } catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

/**
 * PUT /api/users/:id/role — Change a user's role (admin only)
 * Body: { role }
 */
router.put('/:id/role', requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    // Prevent self-demotion
    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const target = await db.get('SELECT id, email FROM users WHERE id = ?', [id]);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }

    await db.run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [role, now(), id]);

    try {
        await syncClerkPublicRole(target, role);
    } catch (err) {
        console.error('Failed to sync role update to Clerk:', err);
    }

    const user = await db.get(
        'SELECT id, email, name, role, department, store_name, status, last_login, created_at FROM users WHERE id = ?',
        [id]
    );

    res.json({ user });
});

/**
 * DELETE /api/users/:id — Disable a user (admin only, reversible)
 */
router.delete('/:id', requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    const target = await db.get('SELECT id, deleted_at FROM users WHERE id = ?', [id]);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (target.deleted_at) {
        return res.status(400).json({ error: 'User is scheduled for deletion. Restore them first.' });
    }

    await db.run('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', ['disabled', now(), id]);

    res.json({ message: 'User has been disabled' });
});

/**
 * DELETE /api/users/:id/permanent — Schedule a user for permanent deletion in 30 days.
 * The row is hard-purged automatically by the background job once `deleted_at` is older than 30 days.
 */
router.delete('/:id/permanent', requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const target = await db.get('SELECT id FROM users WHERE id = ?', [id]);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }

    const timestamp = now();
    await db.run(
        `UPDATE users
         SET status = 'disabled',
             deleted_at = ?,
             updated_at = ?
         WHERE id = ?`,
        [timestamp, timestamp, id]
    );
    await db.run('UPDATE invite_tokens SET used = 1 WHERE user_id = ? AND used = 0', [id]);

    res.json({
        message: 'User scheduled for permanent deletion',
        deleted_at: timestamp,
        purges_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
});

/**
 * PUT /api/users/:id/reactivate — Re-enable a disabled user (admin only)
 */
router.put('/:id/reactivate', requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    const target = await db.get('SELECT id, status FROM users WHERE id = ?', [id]);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }

    await db.run(
        'UPDATE users SET status = ?, deleted_at = NULL, updated_at = ? WHERE id = ?',
        ['active', now(), id]
    );

    const user = await db.get(
        'SELECT id, email, name, role, department, status, last_login, created_at, deleted_at FROM users WHERE id = ?',
        [id]
    );

    res.json({ user });
});

/**
 * PUT /api/users/:id/restore — Cancel a pending deletion and reactivate the user.
 */
router.put('/:id/restore', requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    const target = await db.get('SELECT id, deleted_at FROM users WHERE id = ?', [id]);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (!target.deleted_at) {
        return res.status(400).json({ error: 'User is not pending deletion' });
    }

    await db.run(
        'UPDATE users SET deleted_at = NULL, status = ?, updated_at = ? WHERE id = ?',
        ['active', now(), id]
    );

    const user = await db.get(
        'SELECT id, email, name, role, department, status, last_login, created_at, deleted_at FROM users WHERE id = ?',
        [id]
    );

    res.json({ user });
});

export default router;
