import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

function Layout() {
    const { user, logout } = useAuth();

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>🧪 LabSys</h2>
                    <p>{user?.tenantName || 'Lab Management'}</p>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/" end className="nav-link">
                        <span>📊</span> Dashboard
                    </NavLink>
                    <NavLink to="/patients" className="nav-link">
                        <span>👥</span> Patients
                    </NavLink>
                    <NavLink to="/billing" className="nav-link">
                        <span>💰</span> Billing
                    </NavLink>
                    <NavLink to="/reports" className="nav-link">
                        <span>📄</span> Reports
                    </NavLink>
                    <NavLink to="/finance" className="nav-link">
                        <span>💰</span> Finance
                    </NavLink>
                    <NavLink to="/tests" className="nav-link">
                        <span>🧪</span> Test Master
                    </NavLink>
                    <NavLink to="/doctors" className="nav-link">
                        <span>👨‍⚕️</span> Doctors
                    </NavLink>
                    <NavLink to="/inventory" className="nav-link">
                        <span>📦</span> Inventory
                    </NavLink>
                    <NavLink to="/purchases" className="nav-link">
                        <span>📥</span> Purchases
                    </NavLink>
                    {user?.role === 'ADMIN' && (
                        <>
                            <NavLink to="/branches" className="nav-link">
                                <span>🏢</span> Branches & Staff
                            </NavLink>
                            <NavLink to="/settings" className="nav-link">
                                <span>⚙️</span> Settings
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
                        <div>
                            <div className="user-name">{user?.name}</div>
                            <div className="user-role">{user?.role}</div>
                        </div>
                    </div>
                    <button onClick={logout} className="btn btn-secondary btn-sm">
                        Logout
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
