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
        // If the URL has __clerk_ticket in the hash (e.g. from an old invite link),
        // redirect to the search param format so Clerk's SignUp can read it.
        if (typeof window !== 'undefined' && window.location.hash.includes('__clerk_ticket')) {
            const hash = window.location.hash;
            const match = hash.match(/__clerk_ticket=([^&]+)/);
            if (match && match[1]) {
                const ticket = match[1];
                const url = new URL(window.location.href);
                url.searchParams.set('__clerk_ticket', ticket);
                url.hash = ''; // Clear hash
                window.location.replace(url.toString());
            }
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const [showRequestForm, setShowRequestForm] = useState(false);
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formDesignation, setFormDesignation] = useState('');
    const [formDepartment, setFormDepartment] = useState('');
    const [formRole, setFormRole] = useState('staff');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        const name = formName.trim();
        const email = formEmail.trim().toLowerCase();
        const designation = formDesignation.trim();
        const department = formDepartment.trim();
        const role = formRole;

        if (!name || !email || !designation || !department || !role) {
            setFormError('All fields are required.');
            return;
        }

        if (!email.endsWith('@myfrido.com')) {
            setFormError('Only company emails ending with @myfrido.com are allowed.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/auth/request-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, designation, department, role }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to submit request.');
            }
            setFormSuccess(data.message || 'Access request submitted successfully.');
            setFormName('');
            setFormEmail('');
            setFormDesignation('');
            setFormDepartment('');
            setFormRole('staff');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

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

                            {!showRequestForm ? (
                                <>
                                    <div className="login__form-header">
                                        <h1 className="login__title" id="login-title">Welcome back</h1>
                                        <p className="login__subtitle">Sign in to your dashboard account</p>
                                    </div>

                                    <div className="login__clerk-buttons">
                                        {isInvite ? (
                                            <div style={{ marginTop: '20px' }}>
                                                <SignUp routing="virtual" />
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
                                                <button 
                                                    type="button" 
                                                    className="login__request-btn"
                                                    onClick={() => setShowRequestForm(true)}
                                                >
                                                    Request Access
                                                </button>
                                                <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '16px' }}>
                                                    Accounts are invite-only.<br />Please check your email for an invitation.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="login__form-header">
                                        <h1 className="login__title">Request Access</h1>
                                        <p className="login__subtitle">Request access using your company email</p>
                                    </div>

                                    <form onSubmit={handleRequestSubmit} className="login__request-form">
                                        {formError && <div className="login__alert login__alert--error">{formError}</div>}
                                        {formSuccess && <div className="login__alert login__alert--success">{formSuccess}</div>}

                                        <div className="login__form-group">
                                            <label htmlFor="req-name">Full Name</label>
                                            <input
                                                id="req-name"
                                                type="text"
                                                required
                                                placeholder="John Doe"
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                            />
                                        </div>

                                        <div className="login__form-group">
                                            <label htmlFor="req-email">Company Email</label>
                                            <input
                                                id="req-email"
                                                type="email"
                                                required
                                                placeholder="yourname@myfrido.com"
                                                value={formEmail}
                                                onChange={(e) => setFormEmail(e.target.value)}
                                            />
                                        </div>

                                        <div className="login__form-group">
                                            <label htmlFor="req-designation">Designation</label>
                                            <input
                                                id="req-designation"
                                                type="text"
                                                required
                                                placeholder="Sales Executive"
                                                value={formDesignation}
                                                onChange={(e) => setFormDesignation(e.target.value)}
                                            />
                                        </div>

                                        <div className="login__form-group">
                                            <label htmlFor="req-department">Department</label>
                                            <input
                                                id="req-department"
                                                type="text"
                                                required
                                                placeholder="Retail"
                                                value={formDepartment}
                                                onChange={(e) => setFormDepartment(e.target.value)}
                                            />
                                        </div>

                                        <div className="login__form-group">
                                            <label htmlFor="req-role">Role</label>
                                            <select
                                                id="req-role"
                                                value={formRole}
                                                onChange={(e) => setFormRole(e.target.value)}
                                            >
                                                <option value="staff">Staff (Retail Staff)</option>
                                                <option value="executive">Executive (ISD NM Dashboard)</option>
                                            </select>
                                        </div>

                                        <button type="submit" disabled={isSubmitting} className="login__submit login__submit--request">
                                            <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            className="login__back-link"
                                            onClick={() => {
                                                setShowRequestForm(false);
                                                setFormError('');
                                                setFormSuccess('');
                                            }}
                                        >
                                            Back to Sign In
                                        </button>
                                    </form>
                                </>
                            )}

                            <div className="login__divider"><span>Secured by Clerk</span></div>
                            <div className="login__form-footer">
                                <p>Need help?{' '}<a href="mailto:ritwik.m@myfrido.com" className="login__link">Contact Admin</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>
        </>
    );
}
