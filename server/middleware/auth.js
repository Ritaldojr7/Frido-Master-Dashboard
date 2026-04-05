/**
 * Authentication & Authorization middleware
 * - verifyToken: extracts and validates JWT from Authorization header
 * - requireRole: checks if authenticated user has one of the specified roles
 */
import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'frido-dashboard-secret-change-in-production';

/**
 * Verify JWT token and attach user to request.
 */
export function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare(
            'SELECT id, email, name, role, department, avatar_url, status FROM users WHERE id = ?'
        ).get(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.status === 'disabled') {
            return res.status(403).json({ error: 'Account has been disabled' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Factory: require one of the specified roles.
 * Must be used AFTER verifyToken.
 * @param {string[]} roles - Array of allowed role strings
 */
export function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: roles,
                current: req.user.role,
            });
        }

        next();
    };
}
