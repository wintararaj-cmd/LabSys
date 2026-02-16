import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, branchAPI } from '../services/api'; // Added branchAPI
import { useAuth } from '../context/AuthContext'; // Added useAuth
import {
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

const COLORS = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth(); // Added
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState([]); // Added
    const [selectedBranch, setSelectedBranch] = useState(''); // Added
    const [revenueData, setRevenueData] = useState([]);
    const [testDistribution, setTestDistribution] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            loadBranches();
        }
        loadDashboardData();
    }, [selectedBranch, user?.role]); // Reload when branch changes or user role is available

    const loadBranches = async () => {
        try {
            const response = await branchAPI.getAll();
            setBranches(response.data.branches || []);
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    };

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const response = await dashboardAPI.getStats(selectedBranch);
            setStats(response.data);

            // Generate revenue trend data (last 7 days)
            generateRevenueData(response.data);

            // Generate test distribution data
            generateTestDistribution(response.data);

            // Generate monthly data
            generateMonthlyData(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateRevenueData = (data) => {
        // Simulated revenue trend for last 7 days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const revenueData = days.map((day, index) => ({
            day,
            revenue: Math.floor(Math.random() * 50000) + 20000,
            patients: Math.floor(Math.random() * 30) + 10
        }));
        setRevenueData(revenueData);
    };

    const generateTestDistribution = (data) => {
        if (data?.topTests) {
            const distribution = data.topTests.slice(0, 5).map(test => ({
                name: test.name,
                value: test.count
            }));
            setTestDistribution(distribution);
        }
    };

    const generateMonthlyData = (data) => {
        // Simulated monthly data for last 6 months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const monthlyData = months.map(month => ({
            month,
            revenue: Math.floor(Math.random() * 500000) + 200000,
            tests: Math.floor(Math.random() * 300) + 100,
            patients: Math.floor(Math.random() * 200) + 80
        }));
        setMonthlyData(monthlyData);
    };

    const handleQuickAction = (action) => {
        switch (action) {
            case 'newPatient':
                navigate('/patients');
                break;
            case 'newInvoice':
                navigate('/billing');
                break;
            case 'enterResults':
                navigate('/reports');
                break;
            case 'viewReports':
                navigate('/reports');
                break;
            default:
                break;
        }
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>📊 Dashboard</h1>
                    <p>Welcome back! Here's what's happening today.</p>
                </div>
                {user?.role === 'ADMIN' && (
                    <div className="branch-selector">
                        <select
                            className="form-select"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            style={{ width: '250px' }}
                        >
                            <option value="">🏪 Consolidated (All Branches)</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>
                                    {b.is_main_branch ? '⭐ ' : '📍 '}{b.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card blue">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-label">Today's Collection</div>
                        <div className="stat-value">₹{stats?.todayCollection?.toLocaleString() || 0}</div>
                        <div className="stat-change positive">+12% from yesterday</div>
                    </div>
                </div>

                <div className="stat-card purple">
                    <div className="stat-icon">🗓️</div>
                    <div className="stat-content">
                        <div className="stat-label">FY Collection ({stats?.accountingYearLabel})</div>
                        <div className="stat-value">₹{stats?.fyCollection?.toLocaleString() || 0}</div>
                        <div className="stat-change positive">Year to Date</div>
                    </div>
                </div>

                <div className="stat-card green">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <div className="stat-label">Today's Patients</div>
                        <div className="stat-value">{stats?.todayPatients || 0}</div>
                        <div className="stat-change positive">+8% from yesterday</div>
                    </div>
                </div>

                <div className="stat-card yellow">
                    <div className="stat-icon">📄</div>
                    <div className="stat-content">
                        <div className="stat-label">Pending Reports</div>
                        <div className="stat-value">{stats?.pendingReports || 0}</div>
                        <div className="stat-change neutral">Requires attention</div>
                    </div>
                </div>

                <div className="stat-card red">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-label">Low Stock Items</div>
                        <div className="stat-value">{stats?.lowStockItems || 0}</div>
                        <div className="stat-change warning">Action needed</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                {/* Revenue Trend Chart */}
                <div className="chart-card large">
                    <div className="chart-header">
                        <h3>📈 Revenue Trend (Last 7 Days)</h3>
                        <span className="chart-subtitle">Daily revenue and patient count</span>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3498db" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3498db" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="day" stroke="#7f8c8d" />
                                <YAxis stroke="#7f8c8d" />
                                <Tooltip
                                    contentStyle={{
                                        background: '#fff',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '10px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#3498db"
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Test Distribution Pie Chart */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>🧪 Test Distribution</h3>
                        <span className="chart-subtitle">Top 5 tests this month</span>
                    </div>
                    <div className="chart-content">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={testDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {testDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Monthly Analytics */}
            <div className="chart-card full-width">
                <div className="chart-header">
                    <h3>📊 Monthly Analytics (Last 6 Months)</h3>
                    <span className="chart-subtitle">Revenue, tests, and patients overview</span>
                </div>
                <div className="chart-content">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="month" stroke="#7f8c8d" />
                            <YAxis stroke="#7f8c8d" />
                            <Tooltip
                                contentStyle={{
                                    background: '#fff',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    padding: '10px'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="revenue" fill="#3498db" name="Revenue (₹)" />
                            <Bar dataKey="tests" fill="#2ecc71" name="Tests" />
                            <Bar dataKey="patients" fill="#f39c12" name="Patients" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="dashboard-bottom">
                {/* Top Tests Table */}
                <div className="card">
                    <h3 className="card-header">🏆 Top Tests (This Month)</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Test Name</th>
                                    <th>Count</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.topTests?.slice(0, 5).map((test, index) => (
                                    <tr key={index}>
                                        <td className="rank">#{index + 1}</td>
                                        <td className="test-name">{test.name}</td>
                                        <td>
                                            <span className="badge badge-info">{test.count}</span>
                                        </td>
                                        <td>
                                            <span className="trend-up">↗ {Math.floor(Math.random() * 20 + 5)}%</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card">
                    <h3 className="card-header">⚡ Quick Actions</h3>
                    <div className="quick-actions">
                        <button
                            className="action-btn primary"
                            onClick={() => handleQuickAction('newPatient')}
                        >
                            <span className="action-icon">👤</span>
                            <span className="action-label">New Patient</span>
                        </button>
                        <button
                            className="action-btn success"
                            onClick={() => handleQuickAction('newInvoice')}
                        >
                            <span className="action-icon">💰</span>
                            <span className="action-label">New Invoice</span>
                        </button>
                        <button
                            className="action-btn warning"
                            onClick={() => handleQuickAction('enterResults')}
                        >
                            <span className="action-icon">📝</span>
                            <span className="action-label">Enter Results</span>
                        </button>
                        <button
                            className="action-btn info"
                            onClick={() => handleQuickAction('viewReports')}
                        >
                            <span className="action-icon">📊</span>
                            <span className="action-label">View Reports</span>
                        </button>
                    </div>

                    {/* Recent Activity */}
                    <div className="recent-activity">
                        <h4>Recent Activity</h4>
                        <div className="activity-list">
                            <div className="activity-item">
                                <div className="activity-icon blue">👤</div>
                                <div className="activity-content">
                                    <div className="activity-text">New patient registered</div>
                                    <div className="activity-time">5 minutes ago</div>
                                </div>
                            </div>
                            <div className="activity-item">
                                <div className="activity-icon green">💰</div>
                                <div className="activity-content">
                                    <div className="activity-text">Invoice #INV-{Math.floor(Math.random() * 1000)} created</div>
                                    <div className="activity-time">12 minutes ago</div>
                                </div>
                            </div>
                            <div className="activity-item">
                                <div className="activity-icon yellow">📄</div>
                                <div className="activity-content">
                                    <div className="activity-text">Report verified</div>
                                    <div className="activity-time">23 minutes ago</div>
                                </div>
                            </div>
                            <div className="activity-item">
                                <div className="activity-icon purple">🧪</div>
                                <div className="activity-content">
                                    <div className="activity-text">New test added to catalog</div>
                                    <div className="activity-time">1 hour ago</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
