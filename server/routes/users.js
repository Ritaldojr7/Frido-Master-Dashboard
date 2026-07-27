/**
 * User routes — profile CRUD, admin user management, invitations
 * Auth is handled by Clerk; passwords are managed externally.
 */
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db, { now } from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { createClerkInvitationFlow, deliverInviteEmail, clerkClient } from '../services/userInvite.js';
import {
    isAllowedCompanyEmail,
    normalizeEmail,
    isValidEmail,
    normalizeRole,
    VALID_ROLES,
} from '../utils/security.js';
import {
    formatUserRow,
    normalizeRolesArray,
    parseRolesFromRequest,
    primaryRoleFromRoles,
    rolesToDbColumns,
} from '../utils/roles.js';
import { validateImportRow } from '../utils/userImport.js';
import { userMutationLimiter } from '../middleware/rateLimit.js';
import { createNotification } from '../services/notificationService.js';

const router = Router();

/**
 * Merge role into Clerk publicMetadata. Invite rows often use placeholder UUID ids;
 * Clerk only recognizes real ids (`user_…`), so fall back to lookup by email.
 */
async function syncClerkPublicRoles({ dbUserId, email }, rolesInput) {
    const roles = normalizeRolesArray(rolesInput);
    const primary = primaryRoleFromRoles(roles);
    const mergeMd = async (clerkUserId, prevMd) => {
        await clerkClient.users.updateUserMetadata(clerkUserId, {
            publicMetadata: {
                ...(prevMd || {}),
                role: primary,
                roles,
                primary_role: primary,
            },
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
        'SELECT id, email, name, role, roles, department, designation, store_name, avatar_url, status, last_login, created_at FROM users WHERE id = ?',
        [req.user.id]
    );

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: formatUserRow(user) });
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
        values.push(avatar_url == null ? '' : String(avatar_url).trim());
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
        'SELECT id, email, name, role, roles, department, store_name, avatar_url, status, last_login, created_at FROM users WHERE id = ?',
        [req.user.id]
    );

    res.json({ user: formatUserRow(user) });
});

// ── Admin: User Management ──────────────────────────────

async function syncAllUserNamesFromClerk() {
    try {
        const { data: clerkUsers } = await clerkClient.users.getUserList({ limit: 500 });
        for (const cu of clerkUsers) {
            const email = normalizeEmail(cu.emailAddresses[0]?.emailAddress || '');
            if (!email) continue;

            const firstName = cu.firstName || '';
            const lastName = cu.lastName || '';
            const clerkName = [firstName, lastName].filter(Boolean).join(' ').trim();
            if (!clerkName) continue;

            await db.run(
                `UPDATE users 
                 SET name = ?, avatar_url = COALESCE(NULLIF(avatar_url, ''), ?) 
                 WHERE email = ? AND (name = '' OR name = 'User' OR name IS NULL)`,
                [clerkName, cu.imageUrl || '', email]
            );
        }
    } catch (err) {
        console.error('Failed to background-sync names from Clerk:', err);
    }
}

/**
 * GET /api/users — List all users (admin only)
 */
router.get('/', requireRole(['admin']), async (_req, res) => {
    const users = await db.all(
        `SELECT id, email, name, role, roles, department, designation, store_name, avatar_url, status, last_login, created_at, deleted_at
         FROM users
         ORDER BY (deleted_at IS NOT NULL), created_at DESC`
    );

    // Sync in background to avoid blocking response
    syncAllUserNamesFromClerk().catch((err) => console.error('Background user sync failed:', err));

    res.json({ users: users.map((u) => formatUserRow(u)) });
});

/**
 * POST /api/users/invite — Invite a new user (admin only)
 * Body: { email, name, role }
 */
router.post('/invite', requireRole(['admin']), userMutationLimiter, async (req, res) => {
    try {
        const { email, name, role } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!normalizedEmail || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }

        if (!isAllowedCompanyEmail(normalizedEmail)) {
            return res.status(403).json({ error: 'Only approved company email domains can be invited.' });
        }

        const inviteRoles = parseRolesFromRequest({ role }) ?? normalizeRolesArray(['staff']);
        const roleCols = rolesToDbColumns(inviteRoles);
        const userRole = roleCols.role;

        const origin = process.env.FRONTEND_URL || process.env.APP_URL || req.headers.origin || 'http://localhost:4000';

        const existing = await db.get(
            'SELECT id, status, deleted_at FROM users WHERE email = ?',
            [normalizedEmail]
        );
        if (existing) {
            if (existing.deleted_at) {
                await db.run('DELETE FROM users WHERE id = ?', [existing.id]);
            } else {
                let existsInClerk = false;
                try {
                    const { data } = await clerkClient.users.getUserList({ emailAddress: [normalizedEmail] });
                    if (data && data.length > 0) {
                        existsInClerk = true;
                    }
                } catch {
                    /* ignore */
                }
                if (existing.status === 'active' && existsInClerk) {
                    return res.status(409).json({ error: 'A user with this email already exists and is active.' });
                }
                // If inactive / pending / missing in Clerk, remove orphan row to issue fresh invite
                await db.run('DELETE FROM users WHERE id = ?', [existing.id]);
            }
        }

        const department = req.body.department != null ? String(req.body.department).trim() : '';
        const storeName = req.body.store_name || '';

        const clerkOut = await createClerkInvitationFlow({
            normalizedEmail,
            userRole,
            storeName,
            department,
            origin,
        });

        if (clerkOut.error) {
            return res.status(clerkOut.errorStatus || 500).json({ error: clerkOut.error });
        }

        const { existingClerkUser, inviteLink } = clerkOut;

        const id = existingClerkUser ? existingClerkUser.id : uuid();
        await db.run(
            `INSERT INTO users (id, email, name, password_hash, role, roles, department, store_name, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                normalizedEmail,
                name.trim(),
                '',
                roleCols.role,
                roleCols.roles,
                department,
                storeName,
                'invited',
                now(),
                now(),
            ]
        );

        const { emailWarning } = await deliverInviteEmail({
            normalizedEmail,
            name,
            userRole,
            inviteLink,
            inviterId: req.user.id,
            db,
        });

        const user = await db.get(
            'SELECT id, email, name, role, roles, department, store_name, status, created_at FROM users WHERE id = ?',
            [id]
        );

        res.status(201).json({
            user: formatUserRow(user),
            message: emailWarning ? 'Invitation created' : 'Invitation sent successfully',
            warning: emailWarning,
            inviteLink: inviteLink,
        });
    } catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

/**
 * POST /api/users/import — Stage users from CSV/XLSX (admin only). Rows are `import_pending` until bulk-invite.
 * Body: { rows: [{ email, name, role, department?, store_name? }, ...] }
 */
router.post('/import', requireRole(['admin']), userMutationLimiter, async (req, res) => {
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'rows must be a non-empty array' });
        }
        const maxRows = 500;
        if (rows.length > maxRows) {
            return res.status(400).json({ error: `At most ${maxRows} rows per request` });
        }

        const created = [];
        const skipped = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const v = validateImportRow(rows[i], i);
            if (!v.ok) {
                errors.push({ rowIndex: v.rowIndex, email: v.email || null, errors: v.errors });
                continue;
            }

            const existing = await db.get('SELECT id, deleted_at FROM users WHERE email = ?', [v.email]);
            if (existing && !existing.deleted_at) {
                skipped.push({ rowIndex: v.rowIndex, email: v.email, reason: 'already exists' });
                continue;
            }
            if (existing?.deleted_at) {
                await db.run('DELETE FROM users WHERE id = ?', [existing.id]);
            }

            const id = uuid();
            const roleCols = rolesToDbColumns(v.roles ?? v.role);
            try {
                await db.run(
                    `INSERT INTO users (id, email, name, password_hash, role, roles, department, store_name, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        v.email,
                        v.name,
                        '',
                        roleCols.role,
                        roleCols.roles,
                        v.department,
                        v.store_name,
                        'import_pending',
                        now(),
                        now(),
                    ]
                );
                created.push({ rowIndex: v.rowIndex, id, email: v.email });
            } catch (e) {
                errors.push({
                    rowIndex: v.rowIndex,
                    email: v.email,
                    errors: [e.message || 'insert failed'],
                });
            }
        }

        if (created.length > 0) {
            await createNotification({
                type: 'upload',
                title: 'User Batch Imported',
                message: `${req.user.email} imported ${created.length} user(s) into team roster`,
                actorEmail: req.user.email,
                actorName: req.user.name || '',
                metadata: { createdCount: created.length },
            });
        }

        res.status(201).json({
            createdCount: created.length,
            skipped,
            errors,
            created,
        });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: 'Import failed' });
    }
});

/**
 * POST /api/users/bulk-invite — Clerk + email for selected `import_pending` users (admin only).
 * Body: { userIds: string[] }
 */
router.post('/bulk-invite', requireRole(['admin']), userMutationLimiter, async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds must be a non-empty array' });
        }

        const origin = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:4000';
        const DELAY_MS = 350;
        const results = [];

        for (const uid of userIds) {
            const row = await db.get(
                'SELECT id, email, name, role, department, store_name, status FROM users WHERE id = ?',
                [uid]
            );

            if (!row) {
                results.push({ id: uid, ok: false, error: 'user not found' });
                await new Promise((r) => setTimeout(r, DELAY_MS));
                continue;
            }

            if (row.status !== 'import_pending') {
                results.push({ id: uid, ok: false, error: `not import_pending (got ${row.status})` });
                await new Promise((r) => setTimeout(r, DELAY_MS));
                continue;
            }

            const normalizedEmail = normalizeEmail(row.email);
            const userRole = normalizeRole(row.role);

            const clerkOut = await createClerkInvitationFlow({
                normalizedEmail,
                userRole,
                storeName: row.store_name || '',
                department: row.department || '',
                origin,
            });

            if (clerkOut.error) {
                console.warn('[bulk-invite] Clerk failed', normalizedEmail, clerkOut.error);
                results.push({ id: uid, ok: false, email: normalizedEmail, error: clerkOut.error });
                await new Promise((r) => setTimeout(r, DELAY_MS));
                continue;
            }

            const newId = clerkOut.existingClerkUser ? clerkOut.existingClerkUser.id : row.id;

            try {
                if (clerkOut.existingClerkUser) {
                    await db.run(
                        `UPDATE users SET id = ?, status = 'invited', updated_at = ? WHERE id = ?`,
                        [newId, now(), row.id]
                    );
                } else {
                    await db.run(`UPDATE users SET status = 'invited', updated_at = ? WHERE id = ?`, [
                        now(),
                        row.id,
                    ]);
                }
            } catch (dbErr) {
                console.error('[bulk-invite] DB update failed', dbErr);
                results.push({ id: uid, ok: false, email: normalizedEmail, error: dbErr.message || 'db update failed' });
                await new Promise((r) => setTimeout(r, DELAY_MS));
                continue;
            }

            const { emailWarning } = await deliverInviteEmail({
                normalizedEmail,
                name: row.name,
                userRole,
                inviteLink: clerkOut.inviteLink,
                inviterId: req.user.id,
                db,
            });

            results.push({
                id: newId,
                ok: true,
                email: normalizedEmail,
                warning: emailWarning || undefined,
                inviteLink: clerkOut.inviteLink,
            });

            await new Promise((r) => setTimeout(r, DELAY_MS));
        }

        res.json({ results });
    } catch (err) {
        console.error('Bulk invite error:', err);
        res.status(500).json({ error: 'Bulk invite failed' });
    }
});

/**
 * POST /api/users/bulk-delete — Schedule permanent deletion for many users (admin only).
 * Same rules as DELETE /:id/permanent: cannot target self; skip already-pending deletion.
 * Body: { userIds: string[] }
 */
router.post('/bulk-delete', requireRole(['admin']), userMutationLimiter, async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'userIds must be a non-empty array' });
        }

        const DELAY_MS = 150;
        const results = [];

        for (const id of userIds) {
            if (id === req.user.id) {
                results.push({ id, ok: false, error: 'cannot delete your own account' });
                await new Promise((r) => setTimeout(r, DELAY_MS));
                continue;
            }

            const target = await db.get('SELECT id, deleted_at FROM users WHERE id = ?', [id]);
            if (!target) {
                results.push({ id, ok: false, error: 'user not found' });
                await new Promise((r) => setTimeout(r, DELAY_MS));
                continue;
            }
            if (target.deleted_at) {
                results.push({ id, ok: false, error: 'already scheduled for deletion' });
                await new Promise((r) => setTimeout(r, DELAY_MS));
                continue;
            }

            try {
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
                results.push({ id, ok: true, deleted_at: timestamp });
            } catch (dbErr) {
                console.error('[bulk-delete] failed', id, dbErr);
                results.push({ id, ok: false, error: dbErr.message || 'delete failed' });
            }
            await new Promise((r) => setTimeout(r, DELAY_MS));
        }

        res.json({ results });
    } catch (err) {
        console.error('Bulk delete error:', err);
        res.status(500).json({ error: 'Bulk delete failed' });
    }
});

/**
 * PUT /api/users/:id/role — Change a user's role(s) (admin only)
 * Body: { role } or { roles: string[] } or { roles: "staff, feedback" }
 */
router.put('/:id/role', requireRole(['admin']), userMutationLimiter, async (req, res) => {
    const { id } = req.params;
    const parsedRoles = parseRolesFromRequest(req.body);

    if (!parsedRoles || parsedRoles.length === 0) {
        return res.status(400).json({ error: `Invalid role(s). Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    for (const r of parsedRoles) {
        if (!VALID_ROLES.includes(r)) {
            return res.status(400).json({ error: `Invalid role "${r}". Must be one of: ${VALID_ROLES.join(', ')}` });
        }
    }

    if (parsedRoles.includes('admin') && parsedRoles.length > 1) {
        return res.status(400).json({ error: 'Admin cannot be combined with other roles' });
    }

    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const target = await db.get('SELECT id, email FROM users WHERE id = ?', [id]);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }

    const roleCols = rolesToDbColumns(parsedRoles);
    await db.run('UPDATE users SET role = ?, roles = ?, updated_at = ? WHERE id = ?', [
        roleCols.role,
        roleCols.roles,
        now(),
        id,
    ]);

    try {
        await syncClerkPublicRoles(target, parsedRoles);
    } catch (err) {
        console.error('Failed to sync role update to Clerk:', err);
    }

    const user = await db.get(
        'SELECT id, email, name, role, roles, department, store_name, status, last_login, created_at FROM users WHERE id = ?',
        [id]
    );

    res.json({ user: formatUserRow(user) });
});

/**
 * DELETE /api/users/:id — Disable a user (admin only, reversible)
 */
router.delete('/:id', requireRole(['admin']), userMutationLimiter, async (req, res) => {
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
router.delete('/:id/permanent', requireRole(['admin']), userMutationLimiter, async (req, res) => {
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
router.put('/:id/reactivate', requireRole(['admin']), userMutationLimiter, async (req, res) => {
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
router.put('/:id/restore', requireRole(['admin']), userMutationLimiter, async (req, res) => {
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

/**
 * GET /api/users/requests — List all access requests (admin only)
 */
router.get('/requests', requireRole(['admin']), async (_req, res) => {
    try {
        const requests = await db.all(
            `SELECT id, email, name, designation, department, role, status, reviewed_by, created_at, updated_at
             FROM access_requests
             ORDER BY created_at DESC`
        );
        res.json({ requests });
    } catch (err) {
        console.error('List requests error:', err);
        res.status(500).json({ error: 'Internal server error while retrieving access requests.' });
    }
});

/**
 * POST /api/users/requests/:id/approve — Approve a request and invite the user (admin only)
 */
router.post('/requests/:id/approve', requireRole(['admin']), userMutationLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const request = await db.get('SELECT * FROM access_requests WHERE id = ?', [id]);
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ error: `Request has already been ${request.status}` });
        }

        const reviewerEmail = normalizeEmail(req.user?.email);
        if (!isValidEmail(reviewerEmail)) {
            return res.status(400).json({ error: 'Authenticated admin email is missing or invalid.' });
        }

        const normalizedEmail = normalizeEmail(request.email);

        // Run invitation flow
        const origin = process.env.FRONTEND_URL || process.env.APP_URL || req.headers.origin || 'http://localhost:4000';
        
        // Roles details (role cols and roles list matching request role)
        const inviteRoles = parseRolesFromRequest({ role: request.role }) ?? normalizeRolesArray([request.role]);
        const roleCols = rolesToDbColumns(inviteRoles);
        const userRole = roleCols.role;

        const clerkOut = await createClerkInvitationFlow({
            normalizedEmail,
            userRole,
            storeName: '',
            department: request.department,
            origin,
        });

        if (clerkOut.error) {
            return res.status(clerkOut.errorStatus || 500).json({ error: clerkOut.error });
        }

        const { existingClerkUser, inviteLink } = clerkOut;
        const userId = existingClerkUser ? existingClerkUser.id : uuid();

        // 1. Create or reactivate the user row
        const existing = await db.get('SELECT id, status, deleted_at FROM users WHERE email = ?', [normalizedEmail]);
        if (existing) {
            if (existing.deleted_at) {
                await db.run('DELETE FROM users WHERE id = ?', [existing.id]);
            } else {
                let existsInClerk = false;
                try {
                    const { data } = await clerkClient.users.getUserList({ emailAddress: [normalizedEmail] });
                    if (data && data.length > 0) {
                        existsInClerk = true;
                    }
                } catch {
                    /* ignore */
                }
                if (existing.status === 'active' && existsInClerk) {
                    return res.status(409).json({ error: 'A user with this email already exists and is active.' });
                }
                // If inactive / pending / missing in Clerk, remove orphan row to create fresh invited user
                await db.run('DELETE FROM users WHERE id = ?', [existing.id]);
            }
        }

        await db.run(
            `INSERT INTO users (id, email, name, password_hash, role, roles, department, designation, store_name, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                normalizedEmail,
                request.name,
                '',
                roleCols.role,
                roleCols.roles,
                request.department,
                request.designation,
                '',
                'invited',
                now(),
                now(),
            ]
        );

        // 2. Deliver the invite email
        const { emailWarning } = await deliverInviteEmail({
            normalizedEmail,
            name: request.name,
            userRole,
            inviteLink,
            inviterId: req.user.id,
            db,
        });

        // Update the access request status to approved
        const nowIso = new Date().toISOString();
        await db.run(
            'UPDATE access_requests SET status = ?, reviewed_by = ?, updated_at = ? WHERE id = ?',
            ['approved', reviewerEmail, nowIso, id]
        );

        res.json({ message: 'Request approved and invitation sent successfully.', emailWarning });
    } catch (err) {
        console.error('Approve request error:', err);
        res.status(500).json({ error: 'Internal server error while approving access request.' });
    }
});

/**
 * POST /api/users/requests/:id/reject — Reject a request (admin only)
 */
router.post('/requests/:id/reject', requireRole(['admin']), userMutationLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const request = await db.get('SELECT * FROM access_requests WHERE id = ?', [id]);
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ error: `Request has already been ${request.status}` });
        }

        const reviewerEmail = normalizeEmail(req.user?.email);
        if (!isValidEmail(reviewerEmail)) {
            return res.status(400).json({ error: 'Authenticated admin email is missing or invalid.' });
        }

        const nowIso = new Date().toISOString();
        await db.run(
            'UPDATE access_requests SET status = ?, reviewed_by = ?, updated_at = ? WHERE id = ?',
            ['rejected', reviewerEmail, nowIso, id]
        );

        res.json({ message: 'Request rejected successfully.' });
    } catch (err) {
        console.error('Reject request error:', err);
        res.status(500).json({ error: 'Internal server error while rejecting access request.' });
    }
});

export default router;
