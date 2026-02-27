import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useBadges } from '../context/BadgeContext';
import GlobalSearch from './GlobalSearch';
import KeyboardShortcuts from './KeyboardShortcuts';
import './Layout.css';

const NAV_SECTIONS = [
    {
        label: 'Core',
        items: [
            { to: '/', icon: '📊', label: 'Dashboard', end: true },
            { to: '/billing', icon: '💰', label: 'Billing' },
            { to: '/reports', icon: '📄', label: 'Reports' },
            { to: '/radiology', icon: '⚡', label: 'Radiology' },
            { to: '/patients', icon: '🧑‍⚕️', label: 'Patients' },
        ],
    },
    {
        label: 'Management',
        items: [
            { to: '/tests', icon: '🧪', label: 'Test Master' },
            { to: '/doctors', icon: '👨‍⚕️', label: 'Doctors' },
            { to: '/introducers', icon: '🤝', label: 'Introducers' },
            { to: '/inventory', icon: '📦', label: 'Inventory' },
            { to: '/purchases', icon: '📥', label: 'Purchases' },
            { to: '/external-labs', icon: '🔬', label: 'External Labs' },
            { to: '/sample-tracking', icon: '🔍', label: 'Sample Tracking' },
        ],
    },
    {
        label: 'Finance',
        items: [
            { to: '/finance', icon: '📈', label: 'Financial Reports' },
        ],
    },
];

const ADMIN_SECTION = {
    label: 'Admin',
    items: [
        { to: '/branches', icon: '🏢', label: 'Branches & Staff' },
        { to: '/settings', icon: '⚙️', label: 'Settings' },
        { to: '/audit-log', icon: '🔍', label: 'Audit Trail' },
    ],
};

function Layout() {
    const { user, logout } = useAuth();
    const { dark, toggle } = useDarkMode();
    const { badges } = useBadges();

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="sidebar">
                {/* Header */}
                <div className="sidebar-header">
                    <div className="sidebar-logo-row">
                        <div className="sidebar-logo">
                            <div className="sidebar-logo-icon">🧪</div>
                            <span className="sidebar-logo-text">LabSys</span>
                        </div>
                        <button
                            className="dark-toggle-btn"
                            onClick={toggle}
                            title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            aria-label="Toggle dark mode"
                        >
                            {dark ? '☀️' : '🌙'}
                        </button>
                    </div>
                    <div className="sidebar-tenant">{user?.tenantName || 'Lab Management'}</div>
                </div>

                {/* Global Search */}
                <div className="sidebar-search-wrap">
                    <GlobalSearch />
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav" aria-label="Main navigation">
                    {NAV_SECTIONS.map((section) => (
                        <React.Fragment key={section.label}>
                            <div className="nav-group-label">{section.label}</div>
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className="nav-link"
                                    aria-label={item.label}
                                >
                                    <span className="nav-link-icon">{item.icon}</span>
                                    <span className="nav-link-label">{item.label}</span>
                                    {item.to === '/reports' && badges.pendingReports > 0 && (
                                        <span className="nav-badge" title={`${badges.pendingReports} pending reports`}>
                                            {badges.pendingReports > 99 ? '99+' : badges.pendingReports}
                                        </span>
                                    )}
                                    {item.to === '/inventory' && badges.lowStock > 0 && (
                                        <span className="nav-badge warn" title={`${badges.lowStock} low stock alerts`}>
                                            {badges.lowStock > 99 ? '99+' : badges.lowStock}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                            <div className="nav-divider" />
                        </React.Fragment>
                    ))}

                    {/* Admin-only section */}
                    {user?.role === 'ADMIN' && (
                        <>
                            <div className="nav-group-label">{ADMIN_SECTION.label}</div>
                            {ADMIN_SECTION.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className="nav-link"
                                    aria-label={item.label}
                                >
                                    <span className="nav-link-icon">{item.icon}</span>
                                    <span className="nav-link-label">{item.label}</span>
                                </NavLink>
                            ))}
                        </>
                    )}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <div className="user-card">
                        <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
                        <div className="user-details">
                            <div className="user-name">{user?.name}</div>
                            <div className="user-role">{user?.role}</div>
                        </div>
                    </div>
                    <KeyboardShortcuts />
                    <button onClick={logout} className="sidebar-logout-btn" id="sidebar-logout-btn">
                        <span>⏻</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
