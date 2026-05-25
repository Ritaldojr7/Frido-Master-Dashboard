import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import SearchBar from '../SearchBar/SearchBar';
import UserMenu from '../UserMenu/UserMenu';
import { sidebarPermissions } from '../../config/permissions';
import { useDashboardData } from '../../context/DashboardDataContext';
import './Layout.css';
import fridoLogo from '../../assets/logo.png';
import Footer from '../Footer/Footer';

const retailStaffIcon = 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';

const navItems = [
    { path: '/retail-staff', label: 'Retail - Staff', icon: retailStaffIcon },
    { path: '/retail-admin', label: 'Retail - Admin', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    {
        path: '/isd-nm',
        label: 'ISD NM',
        icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    },
    { path: '/business-analytics', label: 'Business Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/feedback-department', label: 'Feedback Department', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
];

// Admin-only nav item
const adminNavItem = {
    path: '/admin', label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
};

export default function Layout({ children }) {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [isCompactNav, setIsCompactNav] = useState(() => window.innerWidth <= 1024);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, hasRole } = useAuth();
    const location = useLocation();

    const isRetailStaff = location.pathname === '/' || location.pathname === '/retail-staff';

    const { staffRetail } = useDashboardData();

    const staffStats = useMemo(() => {
        const sections = staffRetail.sections || [];
        const total = sections.reduce((s, sec) => s + sec.links.length, 0);
        const coming = sections.reduce((s, sec) => s + sec.links.filter(l => l.isComingSoon).length, 0);
        return { sections: sections.length, live: total - coming, coming, sectionNames: sections.map(s => s.title) };
    }, [staffRetail]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const update = (compact) => {
            setIsCompactNav(compact);
            if (compact) setSidebarExpanded(false);
            if (!compact) setMobileNavOpen(false);
        };

        if (typeof window.matchMedia === 'function') {
            const media = window.matchMedia('(max-width: 1024px)');
            const sync = () => update(media.matches);
            sync();
            media.addEventListener('change', sync);
            return () => media.removeEventListener('change', sync);
        }

        const onResize = () => update(window.innerWidth <= 1024);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    // Filter nav items by user role
    const visibleNavItems = navItems.filter(item => {
        const allowed = sidebarPermissions[item.path];
        if (!allowed) return true;
        // Safety check: if user is not yet loaded, hide restricted items instead of crashing
        if (!user) return false;
        return allowed.includes(user.role);
    });

    const showAdminNav = hasRole('admin');

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarExpanded ? 'sidebar--expanded' : ''} ${isCompactNav ? 'sidebar--compact' : ''} ${mobileNavOpen ? 'sidebar--mobile-open' : ''}`}
                onMouseEnter={() => !isCompactNav && setSidebarExpanded(true)}
                onMouseLeave={() => !isCompactNav && setSidebarExpanded(false)}
            >
                {/* Collapsed state - just logo text */}
                <div className="sidebar__collapsed">
                    <img src={fridoLogo} alt="frido" className="sidebar__collapsed-logo-img" />
                </div>

                {/* Expanded state */}
                <div className="sidebar__expanded">
                    <div className="sidebar__header">
                        <img src={fridoLogo} alt="frido" className="sidebar__expanded-logo-img" />
                    </div>

                    <nav className="sidebar__nav">
                        {visibleNavItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                }
                                onClick={() => {
                                    if (isCompactNav) setMobileNavOpen(false);
                                }}
                                end={item.path === '/' || item.path === '/retail-staff'}
                            >
                                <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={item.icon} />
                                </svg>
                                <span className="sidebar__link-label">{item.label}</span>
                            </NavLink>
                        ))}

                        {/* Admin divider + link */}
                        {showAdminNav && (
                            <>
                                <div className="sidebar__divider" />
                                <NavLink
                                    to={adminNavItem.path}
                                    className={({ isActive }) =>
                                        `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                    }
                                    onClick={() => {
                                        if (isCompactNav) setMobileNavOpen(false);
                                    }}
                                >
                                    <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={adminNavItem.icon} />
                                    </svg>
                                    <span className="sidebar__link-label">{adminNavItem.label}</span>
                                </NavLink>
                            </>
                        )}
                    </nav>

                    {!hasRole('admin') && isRetailStaff && (
                        <div className="sidebar__context">
                            <div className="sidebar__context-title">Quick Overview</div>
                            <div className="sidebar__context-stats">
                                <div className="sidebar__context-stat">
                                    <span className="sidebar__context-stat-val">{staffStats.sections}</span>
                                    <span className="sidebar__context-stat-lbl">Sections</span>
                                </div>
                                <div className="sidebar__context-stat">
                                    <span className="sidebar__context-stat-val">{staffStats.live}</span>
                                    <span className="sidebar__context-stat-lbl">Live</span>
                                </div>
                                <div className="sidebar__context-stat">
                                    <span className="sidebar__context-stat-val">{staffStats.coming}</span>
                                    <span className="sidebar__context-stat-lbl">Soon</span>
                                </div>
                            </div>
                            <div className="sidebar__context-title" style={{ marginTop: 10 }}>Jump to</div>
                            <div className="sidebar__context-jump">
                                {staffStats.sectionNames.map((name) => {
                                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            className="sidebar__context-jump-link"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const el = document.getElementById(slug);
                                                if (el) {
                                                    const headerOffset = 80;
                                                    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
                                                    window.scrollTo({ top, behavior: 'smooth' });
                                                }
                                            }}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="sidebar__footer">
                        <ThemeToggle />
                    </div>
                </div>

                {/* Accent line */}
                <div className="sidebar__accent-line"></div>
            </aside>
            {isCompactNav && mobileNavOpen ? (
                <button
                    type="button"
                    className="sidebar__backdrop"
                    aria-label="Close menu"
                    onClick={() => setMobileNavOpen(false)}
                />
            ) : null}

            {/* Main Content */}
            <div className="main-wrapper">
                {/* Header */}
                <header className={`header glass ${scrolled ? 'header--scrolled' : ''}`}>
                    <div className="header__left">
                        {isCompactNav ? (
                            <button
                                type="button"
                                className="header__menu-btn"
                                aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={mobileNavOpen}
                                onClick={() => setMobileNavOpen((open) => !open)}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    {mobileNavOpen ? (
                                        <path d="M6 6l12 12M18 6L6 18" />
                                    ) : (
                                        <>
                                            <path d="M4 7h16" />
                                            <path d="M4 12h16" />
                                            <path d="M4 17h16" />
                                        </>
                                    )}
                                </svg>
                            </button>
                        ) : null}
                    </div>
                    <div className="header__right">
                        <div className="header__search">
                            <SearchBar isAdmin={hasRole('admin')} userRole={user?.role} />
                        </div>
                        <UserMenu />
                    </div>
                </header>

                {/* Page Content */}
                <main className="main-content">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
