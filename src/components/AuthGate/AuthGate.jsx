import { useState, useEffect } from 'react';
import { Show, SignInButton, SignUp } from '@clerk/react';
import { useAuth } from '../../context/AuthContext';
import './AuthGate.css';
import fridoLogo from '../../assets/login_logo.png';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export default function AuthGate({ children }) {
    const { isLoading } = useAuth();
    const [mounted, setMounted] = useState(false);
    
    // Check if the URL contains an invitation ticket
    const isInvite = typeof window !== 'undefined' && window.location.href.includes('__clerk_ticket');

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    if (DEMO_MODE) {
        return children;
    }

    // Loading state while Clerk initializes
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

    return (
        <>
            {/* ── Signed In: render the app ── */}
            <Show when="signed-in">
                {children}
            </Show>

            {/* ── Signed Out: show branded login page ── */}
            <Show when="signed-out">
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
                                <div className="login__brand-wordmark">
                                    <img src={fridoLogo} alt="Frido Master Dashboard" className="login__brand-logo-img" />
                                </div>
                            </div>

                            <h2 className="login__brand-headline">
                                One workspace for retail teams,
                                <br />
                                <span className="login__brand-headline-accent">analytics, feedback &amp; admin.</span>
                            </h2>

                            <p className="login__brand-description">
                                Retail staff get fast links to stores and channels; admins run Business Analytics,
                                Retail Admin, notices, and user invites; specialists use Feedback Department — all
                                behind invite-only sign-in with roles that match each account.
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
                                        <span className="login__feature-title">Retail &amp; channel dashboards</span>
                                        <span className="login__feature-desc">Staff shortcuts to experience stores, inside sales, and daily ops tools</span>
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
                                        <span className="login__feature-title">Admin &amp; broadcast tools</span>
                                        <span className="login__feature-desc">User invites, roles, company notices with acknowledgement, and leadership dashboards</span>
                                    </div>
                                </div>
                                <div className="login__feature">
                                    <div className="login__feature-icon login__feature-icon--emerald">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="login__feature-title">Invite-only &amp; role-based access</span>
                                        <span className="login__feature-desc">Clerk-powered sign-in with separate paths for staff, admins, and Feedback Department</span>
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
                                <img src={fridoLogo} alt="frido" className="login__brand-logo-img login__brand-logo-img--mobile" />
                            </div>

                            <div className="login__form-header">
                                <h1 className="login__title" id="login-title">Welcome back</h1>
                                <p className="login__subtitle">Sign in to your dashboard account</p>
                            </div>

                            <div className="login__clerk-buttons">
                                {isInvite ? (
                                    <div style={{ marginTop: '20px' }}>
                                        <SignUp routing="hash" />
                                    </div>
                                ) : (
                                    <>
                                        <SignInButton mode="modal">
                                            <button id="login-submit" type="button" className="login__submit">
                                                <span>Sign In</span>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </SignInButton>
                                        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                                            Accounts are invite-only.<br />Please check your email for an invitation.
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="login__divider"><span>Secured by Clerk</span></div>
                            <div className="login__form-footer">
                                <p>Need help?{' '}<a href="https://www.myfrido.com" target="_blank" rel="noopener noreferrer" className="login__link">Contact Admin</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>
        </>
    );
}
