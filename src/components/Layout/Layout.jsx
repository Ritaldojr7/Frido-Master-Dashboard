import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import SearchBar from '../SearchBar/SearchBar';
import UserMenu from '../UserMenu/UserMenu';
import { hasAccess, ADMIN_ONLY } from '../../config/permissions';
import { useDashboardData } from '../../context/DashboardDataContext';
import './Layout.css';
import fridoLogo from '../../assets/logo.png';
import Footer from '../Footer/Footer';

/* ── SVG icon paths (Heroicons-style) ── */
const ICONS = {
    chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    execDash: 'M3 13h8V3H3zM13 21h8V3h-8zM3 21h8v-6H3z',
    profitDash: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    building: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    globe: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    chevDown: 'M19 9l-7 7-7-7',
    chevLeft: 'M15 19l-7-7 7-7',
    chevRight: 'M9 5l7 7-7 7',
    admin: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
};

/**
 * Hierarchical sidebar navigation structure.
 * Each section has a label and items. Items can have sub-items (children).
 */
const sidebarSections = [
    {
        label: 'Analytics',
        items: [
            {
                label: 'Data & Analytics',
                icon: ICONS.folder,
                children: [
                    { path: 'https://analytics-dashboard-frontend-x2da.onrender.com/?tab=ist', label: 'Frido Analytics', icon: ICONS.chart, isExternal: true },
                    { path: 'https://discount-manager-frontend.onrender.com/dashboard', label: 'Frido Discount', icon: ICONS.profitDash, isExternal: true },
                    { path: '/business-analytics', label: 'Business Analytics', icon: ICONS.chart },
                ],
            },
            {
                label: 'ISD',
                icon: ICONS.folder,
                children: [
                    { path: '/isd/executive-performance', label: 'Executive Performance Dashboard', icon: ICONS.execDash },
                    { path: '/isd/performance-profitability', label: 'Performance Profitability Dashboard', icon: ICONS.profitDash },
                ],
            },
            {
                label: 'Retail Analytics',
                icon: ICONS.folder,
                children: [
                    { path: 'https://dashboard.tangoeye.ai/auth/login', label: 'TangoEye AI', icon: ICONS.chart, isExternal: true },
                    { path: 'https://pilot.goyoyo.ai/', label: 'YoYo AI', icon: ICONS.chart, isExternal: true },
                    { path: 'https://docs.google.com/spreadsheets/d/1vDtjeVr60T3zQvFovHXMz6km_H46YkL91_C45SeiQAk/edit?gid=0#gid=0', label: 'NSO List', icon: ICONS.document, isExternal: true },
                ],
            },
            {
                label: 'Feedback',
                icon: ICONS.chat,
                children: [
                    { path: '/feedback-department', label: 'Feedback Dashboard', icon: ICONS.star },
                    { path: '/ai-calling-feedback', label: 'Feedback AI Calling', icon: ICONS.phone },
                ],
            },
            {
                label: 'ORM',
                icon: ICONS.globe,
                children: [
                    { path: 'https://cx.locobuzz.com/login', label: 'Locobuzz', icon: ICONS.globe, isExternal: true },
                    { path: '/orm', label: 'ORM Dashboard', icon: ICONS.globe },
                ],
            },
        ],
    },
    {
        label: 'ISD Team',
        items: [
            {
                label: 'Team and Bandwidth',
                icon: ICONS.folder,
                children: [
                    { path: 'https://docs.google.com/spreadsheets/d/1_CT5fe9uI6VjJSx685RX3fEDTVVy0nRBMxXyhRMBo6I/edit?gid=0#gid=0', label: 'Team Structure', icon: ICONS.document, isExternal: true },
                    { path: 'https://whimsical.com/PCns3cFh6JdKE69XtYkenY', label: 'Team Organogram', icon: ICONS.globe, isExternal: true },
                ],
            },
        ],
    },
    {
        label: 'Aggregator',
        items: [
            { path: '/retail-staff', label: 'Retail Staff', icon: ICONS.building },
            { path: '/retail-admin', label: 'Retail Admin', icon: ICONS.users },
            { path: '/isd-nm', label: 'ISD NM Staff', icon: ICONS.folder },
        ],
    },
    {
        label: 'Others',
        items: [
            { path: '/order-dispute', label: 'Order Dispute', icon: ICONS.document },
        ],
    },
];

const adminNavItem = {
    path: '/admin',
    label: 'User Management',
    icon: ICONS.admin,
};

function SidebarIcon({ d }) {
    return (
        <svg className="sidebar__link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
        </svg>
    );
}

function SidebarSubGroup({ item, user, isCompactNav, onMobileClose }) {
    const location = useLocation();
    const [open, setOpen] = useState(() => {
        // Auto-expand if any child is active
        return item.children.some((c) => location.pathname === c.path);
    });

    // Keep open when navigating to a child
    useEffect(() => {
        if (item.children.some((c) => location.pathname === c.path)) {
            setOpen(true);
        }
    }, [location.pathname, item.children]);

    const visibleChildren = item.children.filter((c) => hasAccess(user, c.path));
    if (visibleChildren.length === 0) return null;

    return (
        <div className={`sidebar__subgroup ${open ? 'sidebar__subgroup--open' : ''}`}>
            <button
                type="button"
                className={`sidebar__link sidebar__link--parent ${open ? 'sidebar__link--parent-open' : ''}`}
                onClick={() => setOpen((o) => !o)}
            >
                <SidebarIcon d={item.icon} />
                <span className="sidebar__link-label">{item.label}</span>
                <svg className="sidebar__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS.chevDown} />
                </svg>
            </button>
            {open && (
                <div className="sidebar__subgroup-children">
                    {visibleChildren.map((child) => {
                        if (child.isExternal) {
                            return (
                                <a
                                    key={child.path}
                                    href={child.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="sidebar__link sidebar__link--child"
                                >
                                    <SidebarIcon d={child.icon} />
                                    <span className="sidebar__link-label">{child.label}</span>
                                </a>
                            );
                        }
                        return (
                            <NavLink
                                key={child.path}
                                to={child.path}
                                className={({ isActive }) =>
                                    `sidebar__link sidebar__link--child ${isActive ? 'sidebar__link--active' : ''}`
                                }
                                onClick={() => { if (isCompactNav) onMobileClose(); }}
                            >
                                <SidebarIcon d={child.icon} />
                                <span className="sidebar__link-label">{child.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function Layout({ children }) {
    const [sidebarPinned, setSidebarPinned] = useState(true);
    const [isCompactNav, setIsCompactNav] = useState(() => window.innerWidth <= 1024);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user, hasRole } = useAuth();
    const location = useLocation();

    const { staffRetail } = useDashboardData();

    const isRetailStaff = location.pathname === '/' || location.pathname === '/retail-staff';

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

    const showAdminNav = hasRole('admin');
    const handleMobileClose = () => setMobileNavOpen(false);

    const sidebarOpen = isCompactNav ? mobileNavOpen : sidebarPinned;

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'} ${isCompactNav ? 'sidebar--compact' : ''}`}
            >
                {/* Collapsed state — logo only */}
                <div className="sidebar__collapsed-strip">
                    <img src={fridoLogo} alt="frido" className="sidebar__collapsed-logo-img" />
                    {!isCompactNav && (
                        <button
                            type="button"
                            className="sidebar__toggle"
                            aria-label="Expand sidebar"
                            onClick={() => setSidebarPinned(true)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d={ICONS.chevRight} />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Expanded state */}
                <div className="sidebar__expanded">
                    <div className="sidebar__header">
                        <img src={fridoLogo} alt="frido" className="sidebar__expanded-logo-img" />
                        {!isCompactNav && (
                            <button
                                type="button"
                                className="sidebar__toggle sidebar__toggle--close"
                                aria-label="Collapse sidebar"
                                onClick={() => setSidebarPinned(false)}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={ICONS.chevLeft} />
                                </svg>
                            </button>
                        )}
                    </div>

                    <nav className="sidebar__nav">
                        {sidebarSections.map((section) => {
                            // Filter items & sub-items by access
                            const visibleItems = section.items.filter((item) => {
                                if (item.children) {
                                    return item.children.some((c) => hasAccess(user, c.path));
                                }
                                return hasAccess(user, item.path);
                            });
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={section.label} className="sidebar__section">
                                    <div className="sidebar__section-label">{section.label}</div>
                                    {visibleItems.map((item) => {
                                        if (item.children) {
                                            return (
                                                <SidebarSubGroup
                                                    key={item.label}
                                                    item={item}
                                                    user={user}
                                                    isCompactNav={isCompactNav}
                                                    onMobileClose={handleMobileClose}
                                                />
                                            );
                                        }
                                        return (
                                            <NavLink
                                                key={item.path}
                                                to={item.path}
                                                className={({ isActive }) =>
                                                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                                }
                                                onClick={() => { if (isCompactNav) handleMobileClose(); }}
                                                end={item.path === '/retail-staff'}
                                            >
                                                <SidebarIcon d={item.icon} />
                                                <span className="sidebar__link-label">{item.label}</span>
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {/* Admin divider + link */}
                        {showAdminNav && (
                            <>
                                <div className="sidebar__divider" />
                                <NavLink
                                    to={adminNavItem.path}
                                    className={({ isActive }) =>
                                        `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                    }
                                    onClick={() => { if (isCompactNav) handleMobileClose(); }}
                                >
                                    <SidebarIcon d={adminNavItem.icon} />
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

                </div>

                {/* Accent line (collapsed only) */}
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
            <div className={`main-wrapper ${sidebarOpen && !isCompactNav ? 'main-wrapper--sidebar-open' : ''}`}>
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
                        <div className="header__search-group">
                            <ThemeToggle />
                            <div className="header__search">
                                <SearchBar isAdmin={hasRole('admin')} userRoles={user?.roles ?? [user?.role]} />
                            </div>
                        </div>
                        <UserMenu />
                    </div>
                </header>

                {/* Page Content */}
                <main className={`main-content ${location.pathname.startsWith('/isd/') ? 'main-content--iframe' : ''}`}>
                    {children}
                </main>
                {!location.pathname.startsWith('/isd') && <Footer />}
            </div>
        </div>
    );
}
