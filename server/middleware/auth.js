/**
 * Authentication & Authorization middleware (Clerk)
 * - verifyToken: validates Clerk session JWT from Authorization header
 * - requireRole: checks if authenticated user has one of the specified roles
 */
import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/express';
import db, { now } from '../db.js';

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Verify Clerk JWT token and attach user to request.
 */
export async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the Clerk session token
        const payload = await clerkVerifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        
        const userId = payload.sub;
        let userRow = await db.get('SELECT id, role, email, name FROM users WHERE id = ?', [userId]);

        if (!userRow) {
            // User not yet synced to SQLite under this Clerk ID.
            // Fetch their full profile from Clerk to get the authoritative role and email.
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const role = clerkUser.publicMetadata?.role || 'staff';
                const email = clerkUser.emailAddresses[0]?.emailAddress || '';
                const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';

                // Sync Clerk user to local SQLite (updates placeholder ID from invitation)
                if (email) {
                    await db.run(
                        `INSERT INTO users (id, email, name, password_hash, role, status, updated_at)
                         VALUES (?, ?, ?, ?, ?, 'active', ?)
                         ON CONFLICT (email) DO UPDATE SET
                         id = excluded.id,
                         status = 'active',
                         role = excluded.role,
                         last_login = excluded.updated_at,
                         updated_at = excluded.updated_at`,
                        [userId, email, name, '', role, now()]
                    );
                }
                userRow = { id: userId, role, email, name };
            } catch (clerkErr) {
                console.error('Failed to fetch user from Clerk:', clerkErr.message);
                userRow = { id: userId, role: 'staff', email: '', name: 'User' }; // Safe fallback
            }
        } else {
            // User exists, just update last login
            await db.run('UPDATE users SET last_login = ? WHERE id = ?', [now(), userId]);
        }

        // Build a user-like object from the DB record
        req.user = {
            id: userRow.id,
            role: userRow.role,
            email: userRow.email,
            name: userRow.name || 'User',
        };

        next();
    } catch (err) {
        console.error('Clerk token verification failed:', err.message);
        if (err.message?.includes('expired')) {
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
