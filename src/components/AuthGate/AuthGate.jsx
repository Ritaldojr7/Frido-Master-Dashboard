import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthGate.css';

export default function AuthGate({ children }) {
    const { isAuthenticated, isLoading, login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotSending, setForgotSending] = useState(false);

    // Password reset flow
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [showResetForm, setShowResetForm] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Check URL for reset token
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('reset');
        if (token) {
            setResetToken(token);
            setShowResetForm(true);
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
        } catch (err) {
            setError(err.message || 'Invalid credentials. Please try again.');
            setPassword('');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotMessage('');
        setForgotSending(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await res.json();
            setForgotMessage(data.message || 'If an account exists, a reset link has been sent.');
        } catch {
            setForgotMessage('Something went wrong. Please try again.');
        } finally {
            setForgotSending(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetMessage('');

        if (newPassword !== confirmPassword) {
            setResetMessage('Passwords do not match');
            return;
        }
        if (newPassword.length < 4) {
            setResetMessage('Password must be at least 4 characters');
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setResetMessage('Password reset successful! You can now sign in.');
                setTimeout(() => {
                    setShowResetForm(false);
                    setResetToken('');
                }, 2000);
            } else {
                setResetMessage(data.error || 'Reset failed');
            }
        } catch {
            setResetMessage('Something went wrong. Please try again.');
        }
    };

    // Loading state while restoring session
    if (isLoading) {
        return (
            <div className="login login--mounted">
                <div className="login__loading">
                    <div className="login__brand-icon">
                        <svg viewBox="0 0 32 32" fill="none">
                            <path d="M16 2L6 18h8l-2 12 14-18h-8l2-10z" fill="currentColor" />
                        </svg>
                    </div>
                    <span className="login__spinner" />
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return children;
    }

    // Password Reset Form
    if (showResetForm) {
        return (
            <div className={`login ${mounted ? 'login--mounted' : ''}`}>
                <div className="login__bg-orbs" aria-hidden="true">
                    <div className="login__orb login__orb--1" />
                    <div className="login__orb login__orb--2" />
                    <div className="login__orb login__orb--3" />
                </div>
                <div className="login__form-panel login__form-panel--centered">
                    <div className="login__form-container">
                        <div className="login__mobile-logo" style={{ display: 'flex' }}>
                            <div className="login__brand-icon login__brand-icon--sm">
                                <svg viewBox="0 0 32 32" fill="none">
                                    <path d="M16 2L6 18h8l-2 12 14-18h-8l2-10z" fill="currentColor" />
                                </svg>
                            </div>
                            <span className="login__brand-name">Frido</span>
                        </div>
                        <div className="login__form-header" style={{ textAlign: 'center' }}>
                            <h1 className="login__title">Reset Password</h1>
                            <p className="login__subtitle">Enter your new password below</p>
                        </div>
                        <form onSubmit={handleResetPassword} className="login__form">
                            <div className="login__field">
                                <label htmlFor="new-password" className="login__label">New Password</label>
                                <div className="login__input-wrapper">
                                    <svg className="login__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                    <input id="new-password" type="password" className="login__input" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                                </div>
                            </div>
                            <div className="login__field">
                                <label htmlFor="confirm-password" className="login__label">Confirm Password</label>
                                <div className="login__input-wrapper">
                                    <svg className="login__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0110 0v4" />
                                    </svg>
                                    <input id="confirm-password" type="password" className="login__input" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                </div>
                            </div>
                            {resetMessage && (
                                <div className={`login__error ${resetMessage.includes('successful') ? 'login__success' : ''}`} role="alert">
                                    <span>{resetMessage}</span>
                                </div>
                            )}
                            <button type="submit" className="login__submit">
                                <span>Reset Password</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`login ${mounted ? 'login--mounted' : ''}`}>
            {/* Animated background orbs */}
            <div className="login__bg-orbs" aria-hidden="true">
                <div className="login__orb login__orb--1" />
                <div className="login__orb login__orb--2" />
                <div className="login__orb login__orb--3" />
            </div>

            {/* ── Left Branding Panel ── */}
            <div className="login__brand-panel">
                <div className="login__brand-content">
                    <div className="login__brand-logo">
                        <div className="login__brand-icon">
                            <svg viewBox="0 0 32 32" fill="none">
                                <path d="M16 2L6 18h8l-2 12 14-18h-8l2-10z" fill="currentColor" />
                            </svg>
                        </div>
                        <div className="login__brand-wordmark">
                            <span className="login__brand-name">Frido</span>
                            <span className="login__brand-tagline">Master Dashboard</span>
                        </div>
                    </div>

                    <h2 className="login__brand-headline">
                        Your central command
                        <br />
                        <span className="login__brand-headline-accent">for business intelligence.</span>
                    </h2>

                    <p className="login__brand-description">
                        Monitor sales performance, track customer engagement, and make data-driven
                        decisions — all from a single powerful interface.
                    </p>

                    <div className="login__features">
                        <div className="login__feature">
                            <div className="login__feature-icon login__feature-icon--blue">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12V7H5a2 2 0 010-4h14v4" />
                                    <path d="M3 5v14a2 2 0 002 2h16v-5" />
                                    <path d="M18 12a2 2 0 000 4h4v-4h-4z" />
                                </svg>
                            </div>
                            <div>
                                <span className="login__feature-title">Real-time Analytics</span>
                                <span className="login__feature-desc">Live KPIs and performance metrics</span>
                            </div>
                        </div>
                        <div className="login__feature">
                            <div className="login__feature-icon login__feature-icon--amber">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                                </svg>
                            </div>
                            <div>
                                <span className="login__feature-title">Team Management</span>
                                <span className="login__feature-desc">Sales teams and territory insights</span>
                            </div>
                        </div>
                        <div className="login__feature">
                            <div className="login__feature-icon login__feature-icon--emerald">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div>
                                <span className="login__feature-title">Enterprise Security</span>
                                <span className="login__feature-desc">Role-based access and audit logs</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="login__brand-footer">
                    <span>© {new Date().getFullYear()} Frido — All rights reserved</span>
                </div>
            </div>

            {/* ── Right Login Panel ── */}
            <div className="login__form-panel">
                <div className="login__form-container">
                    {/* Mobile logo */}
                    <div className="login__mobile-logo">
                        <div className="login__brand-icon login__brand-icon--sm">
                            <svg viewBox="0 0 32 32" fill="none">
                                <path d="M16 2L6 18h8l-2 12 14-18h-8l2-10z" fill="currentColor" />
                            </svg>
                        </div>
                        <span className="login__brand-name">Frido</span>
                    </div>

                    {showForgotPassword ? (
                        <>
                            <div className="login__form-header">
                                <h1 className="login__title" id="login-title">Forgot password?</h1>
                                <p className="login__subtitle">Enter your email and we'll send you a reset link</p>
                            </div>
                            <form onSubmit={handleForgotPassword} className="login__form">
                                <div className="login__field">
                                    <label htmlFor="forgot-email" className="login__label">Email</label>
                                    <div className="login__input-wrapper">
                                        <svg className="login__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
                                        </svg>
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            className="login__input"
                                            placeholder="your.email@frido.com"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            autoFocus
                                            required
                                        />
                                    </div>
                                </div>
                                {forgotMessage && (
                                    <div className="login__error login__success" role="status">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                                            <path d="M22 4L12 14.01l-3-3" />
                                        </svg>
                                        <span>{forgotMessage}</span>
                                    </div>
                                )}
                                <button type="submit" className="login__submit" disabled={forgotSending || !forgotEmail}>
                                    {forgotSending ? <span className="login__spinner" /> : <span>Send Reset Link</span>}
                                </button>
                            </form>
                            <div className="login__divider"><span>or</span></div>
                            <div className="login__form-footer">
                                <p>
                                    <button className="login__link" onClick={() => { setShowForgotPassword(false); setForgotMessage(''); }}>
                                        ← Back to Sign In
                                    </button>
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="login__form-header">
                                <h1 className="login__title" id="login-title">Welcome back</h1>
                                <p className="login__subtitle">Sign in to your dashboard account</p>
                            </div>

                            <form onSubmit={handleSubmit} className="login__form" aria-labelledby="login-title">
                                <div className="login__field">
                                    <label htmlFor="login-email" className="login__label">Email</label>
                                    <div className="login__input-wrapper">
                                        <svg className="login__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
                                        </svg>
                                        <input id="login-email" type="email" className="login__input" placeholder="admin@frido.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
                                    </div>
                                </div>
                                <div className="login__field">
                                    <label htmlFor="login-password" className="login__label">Password</label>
                                    <div className="login__input-wrapper">
                                        <svg className="login__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0110 0v4" />
                                        </svg>
                                        <input id="login-password" type={showPassword ? 'text' : 'password'} className="login__input login__input--password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                                        <button type="button" className="login__password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                                            {showPassword ? (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><path d="M14.12 14.12a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="login__options">
                                    <label className="login__checkbox-label" htmlFor="login-remember">
                                        <input id="login-remember" type="checkbox" className="login__checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                                        <span className="login__checkbox-custom" />
                                        <span>Remember me</span>
                                    </label>
                                    <button type="button" className="login__forgot-link" onClick={() => setShowForgotPassword(true)}>
                                        Forgot password?
                                    </button>
                                </div>
                                {error && (
                                    <div className="login__error" role="alert">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        <span>{error}</span>
                                    </div>
                                )}
                                <button id="login-submit" type="submit" className="login__submit" disabled={isSubmitting || !password}>
                                    {isSubmitting ? <span className="login__spinner" /> : (<><span>Sign In</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>)}
                                </button>
                            </form>
                            <div className="login__divider"><span>Secured by Frido</span></div>
                            <div className="login__form-footer">
                                <p>Don't have an account?{' '}<a href="https://www.myfrido.com" target="_blank" rel="noopener noreferrer" className="login__link">Contact Admin</a></p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
