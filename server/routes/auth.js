/**
 * Auth routes — login, forgot-password, reset-password
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'frido-dashboard-secret-change-in-production';
const JWT_EXPIRES = '24h';

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (user.status === 'disabled') {
            return res.status(403).json({ error: 'Account has been disabled. Contact your administrator.' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = datetime(\'now\'), status = \'active\' WHERE id = ?').run(user.id);

        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department,
                avatar_url: user.avatar_url,
                status: 'active',
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Sends password reset email via Azure
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = db.prepare('SELECT id, email, name FROM users WHERE email = ? AND status != ?')
            .get(email.toLowerCase().trim(), 'disabled');

        // Always return success (don't leak whether email exists)
        if (!user) {
            return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
        }

        // Invalidate previous tokens
        db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?').run(user.id);

        // Create new token (expires in 1 hour)
        const token = uuid();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        db.prepare(
            'INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
        ).run(uuid(), user.id, token, expiresAt);

        // Send email
        await sendPasswordResetEmail(user.email, user.name, token);

        res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const resetToken = db.prepare(
            'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0'
        ).get(token);

        if (!resetToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        if (new Date(resetToken.expires_at) < new Date()) {
            db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);

        db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(hash, resetToken.user_id);

        db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(resetToken.id);

        res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
