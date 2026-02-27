import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import './Doctors.css'; // reuse same CSS

const fmt = (v) => parseFloat(v || 0).toFixed(2);

const Introducers = () => {
    const toast = useToast();
    const [introducers, setIntroducers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingIntroducer, setEditingIntroducer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Commission modal
    const [showCommissionModal, setShowCommissionModal] = useState(false);
    const [selectedIntroducer, setSelectedIntroducer] = useState(null);
    const [commissionData, setCommissionData] = useState(null);
    const [payouts, setPayouts] = useState([]);
    const [activeTab, setActiveTab] = useState('OVERVIEW');
    const [payoutForm, setPayoutForm] = useState({
        amount: '',
        paymentMode: 'CASH',
        referenceNumber: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });

    const [formData, setFormData] = useState({
        name: '',
        specialization: '',
        phone: '',
        email: '',
        commissionPercentage: ''
    });

    const PER_PAGE = 10;

    useEffect(() => { fetchIntroducers(); }, []);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setShowCommissionModal(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const fetchIntroducers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/doctors/introducers/list');
            setIntroducers(res.data.introducers || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch introducers');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingIntroducer) {
                await api.put(`/doctors/introducers/${editingIntroducer.id}`, formData);
                toast.success('Introducer updated successfully!');
            } else {
                await api.post('/doctors/introducers', formData);
                toast.success('Introducer added successfully!');
            }
            resetForm();
            fetchIntroducers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save introducer');
        }
    };

    const handleEdit = (intro) => {
        setEditingIntroducer(intro);
        setFormData({
            name: intro.name,
            specialization: intro.specialization || '',
            phone: intro.phone || '',
            email: intro.email || '',
            commissionPercentage: intro.commission_percentage || ''
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this introducer? This will not affect existing invoices.')) return;
        try {
            await api.delete(`/doctors/${id}`);
            fetchIntroducers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete introducer');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', specialization: '', phone: '', email: '', commissionPercentage: '' });
        setEditingIntroducer(null);
        setShowForm(false);
    };

    const handleViewCommission = async (intro) => {
        try {
            const [commRes, payoutRes] = await Promise.all([
                api.get(`/doctors/introducers/${intro.id}/outstanding`),
                api.get(`/doctors/${intro.id}/payouts`)
            ]);
            setSelectedIntroducer(intro);
            setCommissionData(commRes.data);
            setPayouts(payoutRes.data.payouts || []);
            setActiveTab('OVERVIEW');
            setPayoutForm(prev => ({ ...prev, amount: commRes.data.outstanding_amount?.toFixed(2) || '' }));
            setShowCommissionModal(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load commission data');
        }
    };

    const handleRecordPayout = async () => {
        if (!payoutForm.amount || parseFloat(payoutForm.amount) <= 0) {
            toast.warning('Enter a valid payout amount');
            return;
        }
        try {
            await api.post(`/doctors/${selectedIntroducer.id}/payout`, payoutForm);
            toast.success('Payout recorded successfully!');
            handleViewCommission(selectedIntroducer);
            setActiveTab('OVERVIEW');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to record payout');
        }
    };

    // Filtered + paginated
    const filtered = introducers.filter(i =>
        i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.phone?.includes(searchTerm)
    );
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    // Summary totals
    const totalOutstanding = introducers.reduce((s, i) =>
        s + (parseFloat(i.total_commission_earned) - parseFloat(i.total_commission_paid)), 0);
    const totalEarnedAll = introducers.reduce((s, i) => s + parseFloat(i.total_commission_earned), 0);

    if (loading) return <div className="doctors-container"><div className="loading">Loading introducers...</div></div>;

    return (
        <div className="doctors-container">
            {/* Header */}
            <div className="doctors-header">
                <div>
                    <h1>🤝 Introducer Management</h1>
                    <p>Track introducers, referral counts, and commission payouts</p>
                </div>
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? '✕ Cancel' : '➕ Add Introducer'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                <div className="stat-card">
                    <label>Total Introducers</label>
                    <div className="value">{introducers.length}</div>
                </div>
                <div className="stat-card">
                    <label>Total Commission Earned</label>
                    <div className="value">₹{fmt(totalEarnedAll)}</div>
                </div>
                <div className="stat-card highlight">
                    <label>Total Outstanding</label>
                    <div className="value">₹{fmt(totalOutstanding)}</div>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="doctor-form-card">
                    <h2>{editingIntroducer ? '✏️ Edit Introducer' : '➕ Add New Introducer'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input type="text" value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Ravi Kumar" required />
                            </div>
                            <div className="form-group">
                                <label>Type / Specialization</label>
                                <input type="text" value={formData.specialization}
                                    onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                                    placeholder="e.g. Physiotherapist, Agent, NGO" />
                            </div>
                            <div className="form-group">
                                <label>Phone *</label>
                                <input type="tel" value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="9876543210" required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="introducer@example.com" />
                            </div>
                            <div className="form-group">
                                <label>Commission % *</label>
                                <input type="number" value={formData.commissionPercentage}
                                    onChange={e => setFormData({ ...formData, commissionPercentage: e.target.value })}
                                    placeholder="e.g. 10" min="0" max="100" step="0.01" required />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-save">
                                {editingIntroducer ? '💾 Update' : '➕ Add Introducer'}
                            </button>
                            <button type="button" onClick={resetForm} className="btn-cancel">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="search-section">
                <input type="text"
                    placeholder="🔍 Search by name, type, or phone..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="search-input" />
                <div className="stats-badge">
                    {filtered.length} introducer{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Table */}
            <div className="doctors-table-container">
                <table className="doctors-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Phone</th>
                            <th>Commission %</th>
                            <th>Cases Sent</th>
                            <th>Earned</th>
                            <th>Paid</th>
                            <th>Outstanding</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="no-data">
                                    {searchTerm ? 'No introducers found matching search' : 'No introducers added yet'}
                                    {!searchTerm && (
                                        <button className="btn-add-first" onClick={() => setShowForm(true)}>
                                            Add First Introducer
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ) : paged.map(intro => {
                            const outstanding = parseFloat(intro.total_commission_earned) - parseFloat(intro.total_commission_paid);
                            return (
                                <tr key={intro.id}>
                                    <td className="doctor-name">
                                        <div className="name-cell">
                                            <strong>{intro.name}</strong>
                                            {intro.email && <small>{intro.email}</small>}
                                        </div>
                                    </td>
                                    <td>{intro.specialization || '—'}</td>
                                    <td>{intro.phone}</td>
                                    <td>
                                        <span className="commission-badge">
                                            {intro.commission_percentage}%
                                        </span>
                                    </td>
                                    <td>
                                        <span className="referral-count">{intro.referral_count || 0}</span>
                                    </td>
                                    <td style={{ color: '#059669', fontWeight: 700 }}>
                                        ₹{fmt(intro.total_commission_earned)}
                                    </td>
                                    <td style={{ color: '#6b7280' }}>
                                        ₹{fmt(intro.total_commission_paid)}
                                    </td>
                                    <td>
                                        <span style={{
                                            fontWeight: 700,
                                            color: outstanding > 0 ? '#dc2626' : '#059669'
                                        }}>
                                            ₹{fmt(outstanding)}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button onClick={() => handleViewCommission(intro)} className="btn-view" title="Commission & Payout">💰</button>
                                        <button onClick={() => handleEdit(intro)} className="btn-edit" title="Edit">✏️</button>
                                        <button onClick={() => handleDelete(intro.id)} className="btn-delete" title="Delete">🗑️</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
                </div>
            )}

            {/* Commission & Payout Modal */}
            {showCommissionModal && selectedIntroducer && commissionData && (
                <div className="modal-overlay">
                    <div className="modal-content large-modal">
                        <div className="modal-header">
                            <div>
                                <h2>💰 Commission: {selectedIntroducer.name}</h2>
                                <p className="subtitle">Commission % — {selectedIntroducer.commission_percentage}%</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowCommissionModal(false)}>✕</button>
                        </div>

                        <div className="modal-body p-0">
                            <div className="tabs">
                                {['OVERVIEW', 'MONTHLY', 'PAYOUTS', 'NEW_PAYOUT'].map(tab => (
                                    <button key={tab}
                                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab)}>
                                        {tab === 'OVERVIEW' ? '📊 Overview'
                                            : tab === 'MONTHLY' ? '📅 Monthly'
                                                : tab === 'PAYOUTS' ? '💸 History'
                                                    : '➕ Record Payout'}
                                    </button>
                                ))}
                            </div>

                            <div className="tab-content p-4">

                                {/* OVERVIEW */}
                                {activeTab === 'OVERVIEW' && (
                                    <div className="overview-tab">
                                        <div className="stats-grid">
                                            <div className="stat-card">
                                                <label>Total Cases</label>
                                                <div className="value">{commissionData.total_invoices}</div>
                                            </div>
                                            <div className="stat-card">
                                                <label>Total Business</label>
                                                <div className="value">₹{fmt(commissionData.total_business)}</div>
                                            </div>
                                            <div className="stat-card">
                                                <label>Commission Earned</label>
                                                <div className="value" style={{ color: '#059669' }}>₹{fmt(commissionData.total_earned)}</div>
                                            </div>
                                            <div className="stat-card">
                                                <label>Commission Paid</label>
                                                <div className="value" style={{ color: '#6b7280' }}>₹{fmt(commissionData.total_paid)}</div>
                                            </div>
                                            <div className="stat-card highlight">
                                                <label>Outstanding Balance</label>
                                                <div className="value" style={{ color: commissionData.outstanding_amount > 0 ? '#dc2626' : '#059669' }}>
                                                    ₹{fmt(commissionData.outstanding_amount)}
                                                </div>
                                            </div>
                                        </div>

                                        {commissionData.outstanding_amount > 0 && (
                                            <div style={{ marginTop: '16px', textAlign: 'right' }}>
                                                <button className="btn-save" onClick={() => setActiveTab('NEW_PAYOUT')}>
                                                    💸 Record Payout Now
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* MONTHLY BREAKDOWN */}
                                {activeTab === 'MONTHLY' && (
                                    <div className="payouts-tab">
                                        {commissionData.monthly?.length === 0 ? (
                                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '30px 0' }}>
                                                No referral activity in last 6 months.
                                            </p>
                                        ) : (
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Month</th>
                                                        <th>Cases</th>
                                                        <th>Commission Earned</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {commissionData.monthly?.map((row, i) => (
                                                        <tr key={i}>
                                                            <td>{row.month}</td>
                                                            <td>{row.invoices}</td>
                                                            <td style={{ fontWeight: 700, color: '#059669' }}>₹{fmt(row.commission)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}

                                {/* PAYOUT HISTORY */}
                                {activeTab === 'PAYOUTS' && (
                                    <div className="payouts-tab">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Mode</th>
                                                    <th>Reference</th>
                                                    <th>Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payouts.length === 0 ? (
                                                    <tr><td colSpan="5" className="text-center">No payouts recorded yet</td></tr>
                                                ) : payouts.map(p => (
                                                    <tr key={p.id}>
                                                        <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                                                        <td style={{ fontWeight: 700, color: '#059669' }}>₹{fmt(p.amount)}</td>
                                                        <td><span className="badge badge-info">{p.payment_mode}</span></td>
                                                        <td>{p.reference_number || '—'}</td>
                                                        <td>{p.notes || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* NEW PAYOUT */}
                                {activeTab === 'NEW_PAYOUT' && (
                                    <div className="new-payout-tab">
                                        <div className="form-group">
                                            <label>Payout Amount (₹) *</label>
                                            <input type="number" className="form-control"
                                                value={payoutForm.amount}
                                                onChange={e => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                                                max={commissionData.outstanding_amount} />
                                            <small className="help-text">
                                                Max outstanding: ₹{fmt(commissionData.outstanding_amount)}
                                            </small>
                                        </div>
                                        <div className="form-group">
                                            <label>Payment Date</label>
                                            <input type="date" className="form-control"
                                                value={payoutForm.paymentDate}
                                                onChange={e => setPayoutForm({ ...payoutForm, paymentDate: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Payment Mode</label>
                                            <select className="form-control"
                                                value={payoutForm.paymentMode}
                                                onChange={e => setPayoutForm({ ...payoutForm, paymentMode: e.target.value })}>
                                                <option value="CASH">Cash</option>
                                                <option value="ONLINE">Online / UPI</option>
                                                <option value="CHECK">Cheque</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Reference No. (Optional)</label>
                                            <input type="text" className="form-control"
                                                placeholder="Transaction ID / Cheque No"
                                                value={payoutForm.referenceNumber}
                                                onChange={e => setPayoutForm({ ...payoutForm, referenceNumber: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Notes</label>
                                            <textarea className="form-control" rows="2"
                                                value={payoutForm.notes}
                                                onChange={e => setPayoutForm({ ...payoutForm, notes: e.target.value })} />
                                        </div>
                                        <button className="btn btn-primary w-100 mt-3"
                                            onClick={handleRecordPayout}
                                            disabled={!payoutForm.amount || parseFloat(payoutForm.amount) <= 0}>
                                            💸 Confirm Payout
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Introducers;
