import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, branchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

const ACTION_META = {
    CREATE: { icon: '➕', color: '#22c55e', bg: '#f0fdf4' },
    UPDATE: { icon: '✏️', color: '#3b82f6', bg: '#eff6ff' },
    DELETE: { icon: '🗑️', color: '#ef4444', bg: '#fef2f2' },
    REFUND: { icon: '↩️', color: '#f59e0b', bg: '#fffbeb' },
    VERIFY: { icon: '✅', color: '#8b5cf6', bg: '#f5f3ff' },
    LOGIN: { icon: '🔑', color: '#14b8a6', bg: '#f0fdfa' },
    DEFAULT: { icon: '📝', color: '#6b7280', bg: '#f9fafb' },
};

const ENTITY_ICON = {
    INVOICE: '🧾', TEST: '🔬', REPORT: '📋',
    PATIENT: '🧑‍⚕️', USER: '👤', INVENTORY: '📦',
};

const PM_COLOR = { CASH: '#22c55e', CARD: '#6366f1', UPI: '#f59e0b', ONLINE: '#14b8a6', UNKNOWN: '#9ca3af' };

function timeAgo(ts) {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString('en-IN');
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: '4px 0 0', fontSize: 12, color: p.color }}>
                    {p.name}: <strong>{p.name.includes('₹') || p.dataKey === 'revenue' ? `₹${parseFloat(p.value).toLocaleString('en-IN')}` : p.value}</strong>
                </p>
            ))}
        </div>
    );
};

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const loadBranches = async () => {
        try {
            const r = await branchAPI.getAll();
            setBranches(r.data.branches || []);
        } catch (e) { console.error(e); }
    };

    const loadDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const r = await dashboardAPI.getStats(selectedBranch);
            setStats(r.data);
            setLastRefreshed(new Date());
        } catch (e) {
            console.error('Dashboard load failed:', e);
        } finally {
            setLoading(false);
        }
    }, [selectedBranch]);

    useEffect(() => {
        if (user?.role === 'ADMIN') loadBranches();
        loadDashboardData();
    }, [selectedBranch]);

    // Auto-refresh every 2 minutes
    useEffect(() => {
        const interval = setInterval(loadDashboardData, 120000);
        return () => clearInterval(interval);
    }, [loadDashboardData]);

    const statCards = stats ? [
        {
            label: "Today's Collection",
            value: `₹${parseFloat(stats.todayCollection || 0).toLocaleString('en-IN')}`,
            icon: '💰', color: 'blue',
            sub: `${stats.todayPatients || 0} patients today`
        },
        {
            label: `FY Collection (${stats.accountingYearLabel || ''})`,
            value: `₹${parseFloat(stats.fyCollection || 0).toLocaleString('en-IN')}`,
            icon: '📅', color: 'purple',
            sub: 'Year to Date'
        },
        {
            label: 'Pending Dues',
            value: `₹${parseFloat(stats.pendingPayments || 0).toLocaleString('en-IN')}`,
            icon: '⏳', color: 'orange',
            sub: 'Outstanding balance'
        },
        {
            label: 'Pending Reports',
            value: stats.pendingReports || 0,
            icon: '📄', color: 'yellow',
            sub: 'Require result entry / verification',
            alert: (stats.pendingReports || 0) > 0
        },
        {
            label: 'Low Stock Items',
            value: stats.lowStockItems || 0,
            icon: '⚠️', color: 'red',
            sub: `${stats.expiringItems || 0} expiring in 30 days`,
            alert: (stats.lowStockItems || 0) > 0
        },
    ] : [];

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    // Build 7-day chart with zeros filled in for missing days
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = d.toISOString().split('T')[0];
        const found = (stats?.dailyRevenue || []).find(r => r.date === dateStr);
        return { day: dayStr, revenue: found ? parseFloat(found.revenue) : 0, patients: found ? parseInt(found.patients) : 0 };
    });

    const monthlyChart = (stats?.revenueChart || []).slice().reverse().map(r => ({
        month: r.month,
        revenue: parseFloat(r.revenue || 0)
    }));

    const paymentPie = (stats?.paymentModeBreakdown || [])
        .filter(p => parseFloat(p.total) > 0)
        .map(p => ({ name: p.payment_mode, value: parseFloat(p.total) }));

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dash-header">
                <div>
                    <h1 className="page-title">📊 Dashboard</h1>
                    <p className="page-subtitle">
                        Welcome back, <strong>{user?.name}</strong> · Last refreshed {timeAgo(lastRefreshed)}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {user?.role === 'ADMIN' && (
                        <select
                            className="form-select"
                            value={selectedBranch}
                            onChange={e => setSelectedBranch(e.target.value)}
                            style={{ width: '220px', height: '38px', fontSize: '13px' }}
                        >
                            <option value="">🏪 All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.is_main_branch ? '⭐ ' : '📍 '}{b.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <button className="btn btn-secondary" onClick={loadDashboardData} style={{ height: '38px' }}>
                        ↺ Refresh
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid-v2">
                {statCards.map((card, i) => (
                    <div key={i} className={`stat-card-v2 ${card.color} ${card.alert ? 'alert-pulse' : ''}`}>
                        <div className="stat-icon-v2">{card.icon}</div>
                        <div className="stat-body">
                            <div className="stat-label-v2">{card.label}</div>
                            <div className="stat-value-v2">{card.value}</div>
                            <div className="stat-sub">{card.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="charts-row">
                {/* 7-Day Revenue Trend - REAL DATA */}
                <div className="chart-card-v2 large">
                    <div className="chart-header-v2">
                        <div>
                            <h3>📈 Revenue — Last 7 Days</h3>
                            <span className="chart-sub">Actual daily collection</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={last7Days} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#gradRev)" dot={{ fill: '#6366f1', r: 4 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Today's Payment Mode Breakdown */}
                <div className="chart-card-v2">
                    <div className="chart-header-v2">
                        <div>
                            <h3>💳 Today's Payments</h3>
                            <span className="chart-sub">By payment mode</span>
                        </div>
                    </div>
                    {paymentPie.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={190}>
                                <PieChart>
                                    <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                                        dataKey="value" paddingAngle={3}>
                                        {paymentPie.map((entry, index) => (
                                            <Cell key={index} fill={PM_COLOR[entry.name] || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={v => `₹${parseFloat(v).toLocaleString('en-IN')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pm-legend">
                                {paymentPie.map((p, i) => (
                                    <div key={i} className="pm-item">
                                        <span className="pm-dot" style={{ background: PM_COLOR[p.name] || COLORS[i] }}></span>
                                        <span className="pm-name">{p.name}</span>
                                        <span className="pm-val">₹{parseFloat(p.value).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state" style={{ height: 200 }}>
                            <p>💤 No collections today yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-row">
                {/* 6-Month Revenue Bar - REAL DATA */}
                <div className="chart-card-v2 large">
                    <div className="chart-header-v2">
                        <div>
                            <h3>📊 Monthly Revenue (6 Months)</h3>
                            <span className="chart-sub">Actual revenue from invoices</span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={28}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
                                tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="revenue" name="Revenue (₹)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Tests - REAL DATA */}
                <div className="chart-card-v2">
                    <div className="chart-header-v2">
                        <div>
                            <h3>🏆 Top Tests (30 Days)</h3>
                            <span className="chart-sub">Most ordered tests</span>
                        </div>
                    </div>
                    {(stats?.topTests || []).length > 0 ? (
                        <div className="top-tests-list">
                            {(stats.topTests || []).map((test, i) => {
                                const max = stats.topTests[0]?.count || 1;
                                const pct = Math.round((test.count / max) * 100);
                                return (
                                    <div key={i} className="top-test-item">
                                        <div className="top-test-rank" style={{ color: COLORS[i] }}>#{i + 1}</div>
                                        <div className="top-test-info">
                                            <div className="top-test-name">{test.name}</div>
                                            <div className="top-test-bar-wrap">
                                                <div className="top-test-bar" style={{ width: `${pct}%`, background: COLORS[i] }}></div>
                                            </div>
                                        </div>
                                        <div className="top-test-count">{test.count}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state"><p>No test data yet this month</p></div>
                    )}
                </div>
            </div>

            {/* Bottom Row */}
            <div className="dash-bottom-row">
                {/* Live Activity Feed - REAL from audit_logs */}
                <div className="chart-card-v2 activity-card">
                    <div className="chart-header-v2">
                        <div>
                            <h3>⚡ Live Activity</h3>
                            <span className="chart-sub">Last 8 system events</span>
                        </div>
                        <button className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={loadDashboardData}>↺</button>
                    </div>
                    <div className="activity-feed">
                        {(stats?.recentActivity || []).length === 0 ? (
                            <p style={{ color: '#9ca3af', fontSize: 13, padding: '8px 0' }}>No activity recorded yet.</p>
                        ) : (
                            (stats.recentActivity || []).map((item, i) => {
                                const meta = ACTION_META[item.action] || ACTION_META.DEFAULT;
                                return (
                                    <div key={i} className="activity-row">
                                        <div className="activity-icon-v2" style={{ background: meta.bg, color: meta.color }}>
                                            {ENTITY_ICON[item.entity_type] || meta.icon}
                                        </div>
                                        <div className="activity-body">
                                            <div className="activity-desc">{item.details || `${item.action} on ${item.entity_type}`}</div>
                                            <div className="activity-meta">
                                                <span className="activity-user">{item.user_name || 'System'}</span>
                                                <span className="activity-time">{timeAgo(item.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="activity-action-badge" style={{ background: meta.bg, color: meta.color }}>
                                            {item.action}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="chart-card-v2 quick-card">
                    <div className="chart-header-v2">
                        <div><h3>🚀 Quick Actions</h3></div>
                    </div>
                    <div className="quick-grid">
                        {[
                            { label: 'New Patient', icon: '👤', path: '/patients', color: '#6366f1' },
                            { label: 'New Invoice', icon: '🧾', path: '/billing', color: '#22c55e' },
                            { label: 'Enter Results', icon: '📝', path: '/reports', color: '#f59e0b' },
                            { label: 'Radiology', icon: '⚡', path: '/radiology', color: '#8b5cf6' },
                            { label: 'Inventory', icon: '📦', path: '/inventory', color: '#14b8a6' },
                            { label: 'Finance', icon: '📊', path: '/finance', color: '#ef4444' },
                        ].map((a, i) => (
                            <button key={i} className="quick-btn-v2" onClick={() => navigate(a.path)}
                                style={{ '--qa-color': a.color }}>
                                <span className="qa-icon">{a.icon}</span>
                                <span className="qa-label">{a.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Alerts box */}
                    {(stats?.pendingReports > 0 || stats?.lowStockItems > 0) && (
                        <div className="alerts-box">
                            <h4>🔔 Alerts</h4>
                            {stats.pendingReports > 0 && (
                                <div className="alert-row warning" onClick={() => navigate('/reports')}>
                                    <span>📄 {stats.pendingReports} report{stats.pendingReports !== 1 ? 's' : ''} pending entry / verification</span>
                                    <span className="alert-arrow">→</span>
                                </div>
                            )}
                            {stats.lowStockItems > 0 && (
                                <div className="alert-row danger" onClick={() => navigate('/inventory')}>
                                    <span>⚠️ {stats.lowStockItems} item{stats.lowStockItems !== 1 ? 's' : ''} below reorder level</span>
                                    <span className="alert-arrow">→</span>
                                </div>
                            )}
                            {stats.expiringItems > 0 && (
                                <div className="alert-row warning" onClick={() => navigate('/inventory')}>
                                    <span>📅 {stats.expiringItems} item{stats.expiringItems !== 1 ? 's' : ''} expiring within 30 days</span>
                                    <span className="alert-arrow">→</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
