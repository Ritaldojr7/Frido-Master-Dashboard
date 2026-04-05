/**
 * RoleGuard — Wrapper component to restrict route access by role.
 * Shows an "Access Denied" page if the user's role doesn't match.
 */
import { useAuth } from '../../context/AuthContext';

export default function RoleGuard({ roles, children }) {
    const { user } = useAuth();

    if (!user) return null;

    if (roles && !roles.includes(user.role)) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
                textAlign: 'center',
                minHeight: '50vh',
            }}>
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 'var(--radius-lg)',
                    background: 'rgba(244, 63, 94, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>
                    Access Restricted
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 400, lineHeight: 1.6 }}>
                    You don't have permission to view this page.
                    Contact your administrator to request access.
                </p>
                <p style={{
                    marginTop: 16,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-tertiary)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                }}>
                    Your role: {user.role}
                </p>
            </div>
        );
    }

    return children;
}
