import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './AuditLog.css';

const ACTION_COLORS = {
    CREATE: '#27ae60',
    UPDATE: '#2980b9',
    DELETE: '#e74c3c',
    REFUND: '#e67e22',
    VERIFY: '#8e44ad',
    LOGIN: '#16a085',
    DEFAULT: '#7f8c8d'
};

const ENTITY_ICONS = {
    INVOICE: '🧾',
    TEST: '🔬',
    REPORT: '📋',
    PATIENT: '🧑‍⚕️',
    USER: '👤',
    INVENTORY: '📦',
    DOCTOR: '👨‍⚕️',
    DEFAULT: '📝'
};

function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 25;

    // Filters
    const [filters, setFilters] = useState({
        action: '',
        entityType: '',
        from: '',
        to: '',
        search: ''
    });
    const [pendingFilters, setPendingFilters] = useState({ ...filters });

    const loadSummary = async () => {
        try {
            setSummaryLoading(true);
            const res = await api.get('/audit/summary');
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to load audit summary', err);
        } finally {
            setSummaryLoading(false);
        }
    };

    const loadLogs = useCallback(async (currentPage = 1, currentFilters = filters) => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit, ...currentFilters };
            // Remove empty filter keys
            Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });

            const res = await api.get('/audit', { params });
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
        } catch (err) {
            console.error('Failed to load audit logs', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadSummary();
    }, []);

    useEffect(() => {
        loadLogs(page, filters);
    }, [page]);

    const handleApplyFilters = () => {
        setFilters({ ...pendingFilters });
        setPage(1);
        loadLogs(1, pendingFilters);
    };

    const handleClearFilters = () => {
        const cleared = { action: '', entityType: '', from: '', to: '', search: '' };
        setPendingFilters(cleared);
        setFilters(cleared);
        setPage(1);
        loadLogs(1, cleared);
    };

    const getActionColor = (action) => ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;
    const getEntityIcon = (entityType) => ENTITY_ICONS[entityType] || ENTITY_ICONS.DEFAULT;

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const renderPayload = (jsonStr) => {
        if (!jsonStr) return <em style={{ color: '#bdc3c7' }}>—</em>;
        try {
            const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
            return (
                <ul className="audit-payload-list">
                    {Object.entries(obj).map(([k, v]) => (
                        <li key={k}><span className="payload-key">{k}:</span> <span className="payload-val">{String(v)}</span></li>
                    ))}
                </ul>
            );
        } catch {
            return <span>{String(jsonStr)}</span>;
        }
    };

    return (
        <div className="audit-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔍 Audit Trail</h1>
                    <p className="page-subtitle">Complete record of all system actions and changes</p>
                </div>
                <button className="btn btn-secondary" onClick={() => { loadLogs(page, filters); loadSummary(); }}>
                    ↺ Refresh
                </button>
            </div>

            {/* Summary Cards */}
            {!summaryLoading && summary && (
                <div className="audit-summary-grid">
                    <div className="audit-summary-section">
                        <h4>Actions (Last 30 Days)</h4>
                        <div className="summary-tags">
                            {summary.byAction.map(a => (
                                <span
                                    key={a.action}
                                    className="summary-tag"
                                    style={{ backgroundColor: getActionColor(a.action) }}
                                    onClick={() => { setPendingFilters({ ...pendingFilters, action: a.action }); }}
                                    title="Click to filter"
                                >
                                    {a.action} <strong>{a.count}</strong>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="audit-summary-section">
                        <h4>By Entity Type</h4>
                        <div className="summary-tags">
                            {summary.byEntity.map(e => (
                                <span
                                    key={e.entity_type}
                                    className="summary-tag entity-tag"
                                    onClick={() => { setPendingFilters({ ...pendingFilters, entityType: e.entity_type }); }}
                                    title="Click to filter"
                                >
                                    {getEntityIcon(e.entity_type)} {e.entity_type} <strong>{e.count}</strong>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="audit-summary-section">
                        <h4>Most Active Users</h4>
                        <div className="top-users-list">
                            {summary.topUsers.map((u, i) => (
                                <div key={i} className="top-user-row">
                                    <span className="top-user-rank">#{i + 1}</span>
                                    <span className="top-user-name">{u.name}</span>
                                    <span className="top-user-role badge badge-secondary" style={{ fontSize: '10px' }}>{u.role}</span>
                                    <span className="top-user-count">{u.actions} actions</span>
                                </div>
                            ))}
                            {summary.topUsers.length === 0 && <p style={{ color: '#aaa', fontSize: '13px' }}>No activity yet</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card audit-filters-card">
                <div className="audit-filters-row">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Search details, entity ID, user..."
                        value={pendingFilters.search}
                        onChange={e => setPendingFilters({ ...pendingFilters, search: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
                    />
                    <select
                        className="form-select"
                        value={pendingFilters.action}
                        onChange={e => setPendingFilters({ ...pendingFilters, action: e.target.value })}
                    >
                        <option value="">All Actions</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                        <option value="REFUND">REFUND</option>
                        <option value="VERIFY">VERIFY</option>
                        <option value="LOGIN">LOGIN</option>
                    </select>
                    <select
                        className="form-select"
                        value={pendingFilters.entityType}
                        onChange={e => setPendingFilters({ ...pendingFilters, entityType: e.target.value })}
                    >
                        <option value="">All Entities</option>
                        <option value="INVOICE">INVOICE</option>
                        <option value="TEST">TEST</option>
                        <option value="REPORT">REPORT</option>
                        <option value="PATIENT">PATIENT</option>
                        <option value="USER">USER</option>
                        <option value="INVENTORY">INVENTORY</option>
                        <option value="DOCTOR">DOCTOR</option>
                    </select>
                    <input
                        type="date"
                        className="form-input"
                        value={pendingFilters.from}
                        onChange={e => setPendingFilters({ ...pendingFilters, from: e.target.value })}
                        title="From date"
                    />
                    <input
                        type="date"
                        className="form-input"
                        value={pendingFilters.to}
                        onChange={e => setPendingFilters({ ...pendingFilters, to: e.target.value })}
                        title="To date"
                    />
                    <button className="btn btn-primary" onClick={handleApplyFilters}>Apply</button>
                    <button className="btn btn-secondary" onClick={handleClearFilters}>Clear</button>
                </div>
            </div>

            {/* Log Table */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Activity Log</h3>
                    {!loading && <span className="badge badge-info">{total.toLocaleString()} total entries</span>}
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <p>📭 No audit logs match your filters.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table audit-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '160px' }}>Timestamp</th>
                                    <th style={{ width: '90px' }}>Action</th>
                                    <th style={{ width: '110px' }}>Entity</th>
                                    <th style={{ width: '80px' }}>ID</th>
                                    <th>User</th>
                                    <th>Details</th>
                                    <th style={{ width: '40px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            className={`audit-row ${expandedLog === log.id ? 'expanded' : ''}`}
                                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        >
                                            <td className="audit-ts">{formatDate(log.created_at)}</td>
                                            <td>
                                                <span
                                                    className="action-badge"
                                                    style={{ backgroundColor: getActionColor(log.action) }}
                                                >
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="entity-cell">
                                                    {getEntityIcon(log.entity_type)} {log.entity_type}
                                                </span>
                                            </td>
                                            <td className="entity-id">
                                                {log.entity_id ? <code>#{log.entity_id}</code> : <em>—</em>}
                                            </td>
                                            <td>
                                                <div className="user-cell">
                                                    <span className="user-name">{log.user_name || <em style={{ color: '#bdc3c7' }}>System</em>}</span>
                                                    {log.user_role && (
                                                        <span className="badge badge-secondary" style={{ fontSize: '9px', marginLeft: '5px' }}>{log.user_role}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="details-cell" title={log.details}>{log.details}</td>
                                            <td className="expand-cell">
                                                {(log.new_values || log.old_values) ? (expandedLog === log.id ? '▲' : '▼') : ''}
                                            </td>
                                        </tr>
                                        {expandedLog === log.id && (log.new_values || log.old_values) && (
                                            <tr className="audit-detail-row">
                                                <td colSpan="7">
                                                    <div className="audit-detail-panel">
                                                        {log.old_values && (
                                                            <div className="payload-section old">
                                                                <h5>⬅ Previous Values</h5>
                                                                {renderPayload(log.old_values)}
                                                            </div>
                                                        )}
                                                        {log.new_values && (
                                                            <div className="payload-section new">
                                                                <h5>➡ New Values</h5>
                                                                {renderPayload(log.new_values)}
                                                            </div>
                                                        )}
                                                        {log.ip_address && (
                                                            <p className="ip-note">🌐 IP: <code>{log.ip_address}</code></p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="audit-pagination">
                        <button
                            className="btn btn-secondary"
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            ← Prev
                        </button>
                        <span className="page-info">Page {page} of {totalPages}</span>
                        <button
                            className="btn btn-secondary"
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuditLog;
