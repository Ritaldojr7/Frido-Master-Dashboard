/**
 * Shared Clerk invitation + invite-link building for admin single and bulk flows.
 */
import { createClerkClient } from '@clerk/express';
import { sendInviteEmail } from './email.js';
import { normalizeEmail } from '../utils/security.js';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

function buildPublicMetadata(userRole, storeName, department) {
    const md = {
        role: userRole,
        store_name: storeName || '',
    };
    if (department != null && String(department).trim() !== '') {
        md.department = String(department).trim();
    }
    return md;
}

/**
 * Create a Clerk invitation (or resolve existing user). Mirrors admin single-invite behaviour.
 *
 * @returns {{ invitation: object|null, existingClerkUser: object|null, inviteLink: string, error: string|null, errorStatus: number|null }}
 */
export async function createClerkInvitationFlow({
    normalizedEmail,
    userRole,
    storeName,
    department,
    origin,
}) {
    const publicMetadata = buildPublicMetadata(userRole, storeName, department);
    let invitation = null;
    let existingClerkUser = null;
    let inviteLink = origin || 'http://localhost:3000';

    try {
        invitation = await clerkClient.invitations.createInvitation({
            emailAddress: normalizedEmail,
            publicMetadata,
            redirectUrl: origin,
            notify: false,
            ignorePolicies: true,
        });
    } catch (clerkErr) {
        const errorCode = clerkErr.errors?.[0]?.code;

        if (errorCode === 'form_identifier_exists') {
            const { data: users } = await clerkClient.users.getUserList({ emailAddress: [normalizedEmail] });
            if (users && users.length > 0) {
                existingClerkUser = users[0];
                await clerkClient.users.updateUserMetadata(existingClerkUser.id, {
                    publicMetadata: {
                        ...(existingClerkUser.publicMetadata || {}),
                        ...buildPublicMetadata(userRole, storeName, department),
                    },
                });
            } else {
                return {
                    invitation: null,
                    existingClerkUser: null,
                    inviteLink,
                    error: 'User exists but could not be retrieved from Clerk.',
                    errorStatus: 500,
                };
            }
        } else if (errorCode === 'duplicate_record') {
            try {
                const { data: invites } = await clerkClient.invitations.getInvitationList({ status: 'pending' });
                const existingInvite = invites.find((i) => i.emailAddress === normalizedEmail);
                if (existingInvite) {
                    await clerkClient.invitations.revokeInvitation(existingInvite.id);
                    invitation = await clerkClient.invitations.createInvitation({
                        emailAddress: normalizedEmail,
                        publicMetadata,
                        redirectUrl: origin,
                        notify: false,
                        ignorePolicies: true,
                    });
                }
            } catch (retryErr) {
                console.error('Failed to recreate invitation:', retryErr);
                return {
                    invitation: null,
                    existingClerkUser: null,
                    inviteLink,
                    error: 'An invitation already exists and could not be recreated.',
                    errorStatus: 500,
                };
            }
        } else {
            console.error('Clerk invitation error:', clerkErr);
            return {
                invitation: null,
                existingClerkUser: null,
                inviteLink,
                error: clerkErr.errors?.[0]?.message || 'Failed to create invitation in Clerk',
                errorStatus: 500,
            };
        }
    }

    if (invitation?.url) {
        try {
            const urlObj = new URL(invitation.url);
            const ticket = urlObj.searchParams.get('ticket') || urlObj.searchParams.get('__clerk_ticket');
            if (ticket) {
                inviteLink = `${origin}/#/sign-up?__clerk_ticket=${ticket}`;
            } else {
                inviteLink = invitation.url;
            }
        } catch {
            inviteLink = invitation.url;
        }
    }

    return {
        invitation,
        existingClerkUser,
        inviteLink,
        error: null,
        errorStatus: null,
    };
}

/**
 * Send MS Graph (or stub) invite email; returns optional warning if misconfigured or send failed.
 */
export async function deliverInviteEmail({
    normalizedEmail,
    name,
    userRole,
    inviteLink,
    inviterId,
    db,
}) {
    const inviter = await db.get('SELECT name, email FROM users WHERE id = ?', [inviterId]);

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

    return { emailWarning };
}

export { clerkClient, normalizeEmail, buildPublicMetadata };
