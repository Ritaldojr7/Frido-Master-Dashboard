/**
 * Authentication & Authorization middleware (Clerk)
 * - verifyToken: validates Clerk session JWT from Authorization header
 * - requireRole: checks if authenticated user has one of the specified roles
 */
import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/express';
import db, { now } from '../db.js';
import { normalizeEmail, normalizeRole } from '../utils/security.js';
import { getUserRoles, parseRolesFromStorage, primaryRoleFromRoles } from '../utils/roles.js';

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
        let userRow = await db.get('SELECT id, role, roles, email, name FROM users WHERE id = ?', [userId]);

        if (!userRow) {
            // User not yet synced to SQLite under this Clerk ID.
            // Fetch their full profile from Clerk to get the authoritative role and email.
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const roleFromClerk = normalizeRole(clerkUser.publicMetadata?.role || 'staff');
                const email = normalizeEmail(clerkUser.emailAddresses[0]?.emailAddress || '');
                const name =
                    `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';

                if (!email) {
                    userRow = { id: userId, role: 'staff', email: '', name: 'User' };
                } else {
                    const existingByEmail = await db.get(
                        'SELECT id, role, roles, email, name FROM users WHERE email = ?',
                        [email]
                    );

                    if (existingByEmail) {
                        // Linked Clerk ID after invite — preserve DB role/department/etc.; Clerk sync often lagged or broken during invite (placeholder id).
                        await db.run(
                            `UPDATE users SET id = ?, status = 'active', last_login = ?, updated_at = ? WHERE email = ?`,
                            [userId, now(), now(), email]
                        );
                        userRow = await db.get(
                            'SELECT id, role, roles, email, name FROM users WHERE id = ?',
                            [userId]
                        );
                    } else {
                        const rolesJson = JSON.stringify([roleFromClerk]);
                        await db.run(
                            `INSERT INTO users (id, email, name, password_hash, role, roles, status, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
                            [userId, email, name, '', roleFromClerk, rolesJson, now()]
                        );
                        userRow = { id: userId, role: roleFromClerk, roles: rolesJson, email, name };
                    }
                }
            } catch (clerkErr) {
                console.error('Failed to fetch user from Clerk:', clerkErr.message);
                userRow = { id: userId, role: 'staff', email: '', name: 'User' }; // Safe fallback
            }
        } else {
            // User exists, just update last login
            await db.run('UPDATE users SET last_login = ? WHERE id = ?', [now(), userId]);
        }

        const roles = parseRolesFromStorage(userRow.roles, userRow.role);
        req.user = {
            id: userRow.id,
            role: primaryRoleFromRoles(roles),
            roles,
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

        const userRoles = getUserRoles(req.user);
        if (!userRoles.includes('admin') && !roles.some((r) => userRoles.includes(r))) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: roles,
                current: userRoles,
            });
        }

        next();
    };
}
