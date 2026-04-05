/**
 * User routes — profile CRUD, admin user management, invitations
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { sendInviteEmail } from '../services/email.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// ── Current User Profile ────────────────────────────────

/**
 * GET /api/users/me — Get current user profile
 */
router.get('/me', (req, res) => {
    const user = db.prepare(
        'SELECT id, email, name, role, department, avatar_url, status, last_login, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
});

/**
 * PUT /api/users/me — Update current user profile
 * Body: { name?, department?, avatar_url? }
 */
router.put('/me', (req, res) => {
    const { name, department, avatar_url } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
        if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
        updates.push('name = ?');
        values.push(name.trim());
    }
    if (department !== undefined) {
        updates.push('department = ?');
        values.push(department.trim());
    }
    if (avatar_url !== undefined) {
        updates.push('avatar_url = ?');
        values.push(avatar_url);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(req.user.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const user = db.prepare(
        'SELECT id, email, name, role, department, avatar_url, status, last_login, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    res.json({ user });
});

/**
 * PUT /api/users/me/password — Change own password
 * Body: { currentPassword, newPassword }
 */
router.put('/me/password', (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run(hash, req.user.id);

    res.json({ message: 'Password updated successfully' });
});

// ── Admin: User Management ──────────────────────────────

/**
 * GET /api/users — List all users (admin only)
 */
router.get('/', requireRole(['admin']), (req, res) => {
    const users = db.prepare(
        'SELECT id, email, name, role, department, avatar_url, status, last_login, created_at FROM users ORDER BY created_at DESC'
    ).all();

    res.json({ users });
});

/**
 * POST /api/users/invite — Invite a new user (admin only)
 * Body: { email, name, role }
 */
router.post('/invite', requireRole(['admin']), async (req, res) => {
    try {
        const { email, name, role } = req.body;

        if (!email || !name) {
            return res.status(400).json({ error: 'Email and name are required' });
        }

        const validRoles = ['admin', 'manager', 'viewer'];
        const userRole = validRoles.includes(role) ? role : 'viewer';

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (existing) {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }

        // Generate temporary password
        const tempPassword = generateTempPassword();
        const hash = bcrypt.hashSync(tempPassword, 10);
        const id = uuid();

        db.prepare(`
            INSERT INTO users (id, email, name, password_hash, role, status)
            VALUES (?, ?, ?, ?, ?, 'invited')
        `).run(id, email.toLowerCase().trim(), name.trim(), hash, userRole);

        // Send invitation email via Azure
        await sendInviteEmail(email.toLowerCase().trim(), name.trim(), tempPassword);

        const user = db.prepare(
            'SELECT id, email, name, role, department, status, created_at FROM users WHERE id = ?'
        ).get(id);

        res.status(201).json({ user, message: 'Invitation sent successfully' });
    } catch (err) {
        console.error('Invite error:', err);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

/**
 * PUT /api/users/:id/role — Change a user's role (admin only)
 * Body: { role }
 */
router.put('/:id/role', requireRole(['admin']), (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'manager', 'viewer'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Prevent self-demotion
    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, id);

    const user = db.prepare(
        'SELECT id, email, name, role, department, status, last_login, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json({ user });
});

/**
 * DELETE /api/users/:id — Disable a user (admin only, soft delete)
 */
router.delete('/:id', requireRole(['admin']), (req, res) => {
    const { id } = req.params;

    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot disable your own account' });
    }

    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET status = \'disabled\', updated_at = datetime(\'now\') WHERE id = ?').run(id);

    res.json({ message: 'User has been disabled' });
});

/**
 * PUT /api/users/:id/reactivate — Re-enable a disabled user (admin only)
 */
router.put('/:id/reactivate', requireRole(['admin']), (req, res) => {
    const { id } = req.params;

    const target = db.prepare('SELECT id, status FROM users WHERE id = ?').get(id);
    if (!target) {
        return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET status = \'active\', updated_at = datetime(\'now\') WHERE id = ?').run(id);

    const user = db.prepare(
        'SELECT id, email, name, role, department, status, last_login, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json({ user });
});

// ── Helpers ─────────────────────────────────────────────

function generateTempPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

export default router;
