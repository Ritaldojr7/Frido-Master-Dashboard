/**
 * Authentication & Authorization middleware (Clerk)
 * - verifyToken: validates Clerk session JWT from Authorization header
 * - requireRole: checks if authenticated user has one of the specified roles
 */
import { createClerkClient, verifyToken as clerkVerifyToken } from '@clerk/express';
import db, { now } from '../db.js';
import { normalizeEmail, isAllowedCompanyEmail } from '../utils/security.js';
import { getUserRoles, parseRolesFromStorage, primaryRoleFromRoles } from '../utils/roles.js';

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Verify Clerk JWT token and attach user to request.
 */
export async function verifyToken(req, res, next) {
    if (process.env.VITE_DEMO_MODE === 'true') {
        req.user = {
            id: 'demo-staff',
            email: 'ritwik.m@myfrido.com',
            name: 'Ritwik',
            role: process.env.VITE_DEMO_ROLE || 'admin',
            roles: [process.env.VITE_DEMO_ROLE || 'admin'],
        };
        return next();
    }

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
        let userRow = await db.get('SELECT id, role, roles, email, name, status FROM users WHERE id = ?', [userId]);

        if (!userRow) {
            // User not yet synced to SQLite under this Clerk ID.
            // Fetch their full profile from Clerk to get the authoritative role and email.
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const email = normalizeEmail(clerkUser.emailAddresses[0]?.emailAddress || '');

                if (!email) {
                    return res.status(403).json({ error: 'Access denied: Email address is required.' });
                }

                if (!isAllowedCompanyEmail(email)) {
                    return res.status(403).json({ error: 'Access denied: Only @myfrido.com domains are allowed.' });
                }

                const existingByEmail = await db.get(
                    'SELECT id, role, roles, email, name, status FROM users WHERE email = ?',
                    [email]
                );

                if (existingByEmail) {
                    if (existingByEmail.status === 'disabled') {
                        return res.status(403).json({ error: 'Access denied: Your account has been disabled.' });
                    }
                    const firstName = clerkUser.firstName || '';
                    const lastName = clerkUser.lastName || '';
                    const clerkName = [firstName, lastName].filter(Boolean).join(' ').trim();
                    const nextName = clerkName || existingByEmail.name || 'User';

                    // Linked Clerk ID after invite — preserve DB role/department/etc.
                    await db.run(
                        `UPDATE users SET id = ?, name = ?, status = 'active', last_login = ?, updated_at = ? WHERE email = ?`,
                        [userId, nextName, now(), now(), email]
                    );
                    userRow = await db.get(
                        'SELECT id, role, roles, email, name, status FROM users WHERE id = ?',
                        [userId]
                    );
                } else {
                    // Under invite-only flow, a user MUST have a record in the database already (status = 'invited' or 'import_pending').
                    return res.status(403).json({ error: 'Access denied: You must be invited by an admin.' });
                }
            } catch (clerkErr) {
                console.error('Failed to fetch user from Clerk:', clerkErr.message);
                return res.status(401).json({ error: 'Authentication failed' });
            }
        } else {
            if (userRow.status === 'disabled') {
                return res.status(403).json({ error: 'Access denied: Your account has been disabled.' });
            }
            if (!isAllowedCompanyEmail(userRow.email)) {
                return res.status(403).json({ error: 'Access denied: Only @myfrido.com domains are allowed.' });
            }

            // Sync name if name is default 'User' or empty
            let nextName = userRow.name;
            if (!userRow.name || userRow.name === 'User') {
                try {
                    const clerkUser = await clerkClient.users.getUser(userId);
                    const firstName = clerkUser.firstName || '';
                    const lastName = clerkUser.lastName || '';
                    const clerkName = [firstName, lastName].filter(Boolean).join(' ').trim();
                    if (clerkName) {
                        nextName = clerkName;
                        await db.run('UPDATE users SET name = ? WHERE id = ?', [clerkName, userId]);
                        userRow.name = clerkName;
                    }
                } catch (clerkErr) {
                    console.error('Failed to sync name from Clerk on login:', clerkErr.message);
                }
            }

            // If the user is logging in but their status is still 'invited' or 'import_pending', update it to 'active' now.
            if (userRow.status === 'invited' || userRow.status === 'import_pending') {
                await db.run(
                    `UPDATE users SET status = 'active', name = ?, last_login = ?, updated_at = ? WHERE id = ?`,
                    [nextName, now(), now(), userId]
                );
                userRow.status = 'active';
            } else {
                // User exists and is active, just update last login
                await db.run('UPDATE users SET last_login = ? WHERE id = ?', [now(), userId]);
            }
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
