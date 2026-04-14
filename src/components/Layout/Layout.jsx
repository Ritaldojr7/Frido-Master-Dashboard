import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import SearchBar from '../SearchBar/SearchBar';
import UserMenu from '../UserMenu/UserMenu';
import { sidebarPermissions } from '../../config/permissions';
import { staffExperienceStoreData } from '../../config/dashboardData';
import './Layout.css';
import fridoLogo from '../../assets/logo.png';
import Footer from '../Footer/Footer';

const retailStaffIcon = 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';

const navItems = [
    { path: '/retail-staff', label: 'Retail - Staff', icon: retailStaffIcon },
    { path: '/retail-admin', label: 'Retail - Admin', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { path: '/business-analytics', label: 'Business Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { path: '/feedback-department', label: 'Feedback Department', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
];

// Admin-only nav item
const adminNavItem = {
    path: '/admin', label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
};

const isStaffApp = import.meta.env.VITE_APP_TYPE === 'STAFF';

export default function Layout({ children }) {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, hasRole } = useAuth();
    const location = useLocation();

    const isRetailStaff = location.pathname === '/' || location.pathname === '/retail-staff';

    const staffStats = useMemo(() => {
        const sections = staffExperienceStoreData.sections;
        const total = sections.reduce((s, sec) => s + sec.links.length, 0);
        const coming = sections.reduce((s, sec) => s + sec.links.filter(l => l.isComingSoon).length, 0);
        return { sections: sections.length, live: total - coming, coming, sectionNames: sections.map(s => s.title) };
    }, []);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Filter nav items by user role
    const staffNavItems = [
        { path: '/', label: 'Retail - Staff', icon: retailStaffIcon }
    ];

    const visibleNavItems = (isStaffApp ? staffNavItems : navItems).filter(item => {
        const allowed = sidebarPermissions[item.path];
        if (!allowed) return true;
        // Safety check: if user is not yet loaded, hide restricted items instead of crashing
        if (!user) return false;
        return allowed.includes(user.role);
    });

    const showAdminNav = !isStaffApp && hasRole('admin');

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarExpanded ? 'sidebar--expanded' : ''}`}
                onMouseEnter={() => setSidebarExpanded(true)}
                onMouseLeave={() => setSidebarExpanded(false)}
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
                                >
                                    <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={adminNavItem.icon} />
                                    </svg>
                                    <span className="sidebar__link-label">{adminNavItem.label}</span>
                                </NavLink>
                            </>
                        )}
                    </nav>

                    {isRetailStaff && (
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

            {/* Main Content */}
            <div className="main-wrapper">
                {/* Header */}
                <header className={`header glass ${scrolled ? 'header--scrolled' : ''}`}>
                    <div className="header__right">
                        <div className="header__search">
                            <SearchBar />
                        </div>
                        {!isStaffApp && <UserMenu />}
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
