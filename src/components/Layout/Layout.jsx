import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import SearchBar from '../SearchBar/SearchBar';
import UserMenu from '../UserMenu/UserMenu';
import { sidebarPermissions, ADMIN_ONLY } from '../../config/permissions';
import './Layout.css';
import fridoLogo from '../../assets/logo.png';
import Footer from '../Footer/Footer';

const navItems = [
    { path: '/', label: 'Dashboard', icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
    { path: '/inside-sales-india', label: 'Sales India', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { path: '/inside-sales-middle-east', label: 'Sales ME', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
    { path: '/experience-store', label: 'Experience Store', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { path: '/retention-calling', label: 'Retention', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: '/online-reputation-management', label: 'ORM', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { path: '/feedback-customer-experience', label: 'Feedback & CX', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
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

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Filter nav items by user role
    const visibleNavItems = isStaffApp ? [
        { path: '/', label: 'Staff Dashboard', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' }
    ] : navItems.filter(item => {
        const allowed = sidebarPermissions[item.path];
        if (!allowed) return true;
        return user && allowed.includes(user.role);
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
                                end={item.path === '/'}
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
