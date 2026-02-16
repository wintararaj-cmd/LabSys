import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Doctors.css';

const API_URL = 'http://localhost:5000/api';

const Doctors = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showCommissionModal, setShowCommissionModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [commissionData, setCommissionData] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        specialization: '',
        qualification: '',
        registration_number: '',
        phone: '',
        email: '',
        address: '',
        commission_type: 'PERCENTAGE',
        commission_value: ''
    });

    const doctorsPerPage = 10;

    useEffect(() => {
        fetchDoctors();
    }, []);

    const fetchDoctors = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/doctors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoctors(response.data.doctors || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch doctors');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');

            if (editingDoctor) {
                await axios.put(
                    `${API_URL}/doctors/${editingDoctor.id}`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                alert('Doctor updated successfully!');
            } else {
                await axios.post(
                    `${API_URL}/doctors`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                alert('Doctor added successfully!');
            }

            resetForm();
            fetchDoctors();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save doctor');
        }
    };

    const handleEdit = (doctor) => {
        setEditingDoctor(doctor);
        setFormData({
            name: doctor.name,
            specialization: doctor.specialization || '',
            qualification: doctor.qualification || '',
            registration_number: doctor.registration_number || '',
            phone: doctor.phone || '',
            email: doctor.email || '',
            address: doctor.address || '',
            commission_type: doctor.commission_type || 'PERCENTAGE',
            commission_value: doctor.commission_value || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (doctorId) => {
        if (!window.confirm('Are you sure you want to delete this doctor?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/doctors/${doctorId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Doctor deleted successfully!');
            fetchDoctors();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete doctor');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            specialization: '',
            qualification: '',
            registration_number: '',
            phone: '',
            email: '',
            address: '',
            commission_type: 'PERCENTAGE',
            commission_value: ''
        });
        setEditingDoctor(null);
        setShowForm(false);
    };

    const [activeTab, setActiveTab] = useState('OVERVIEW');
    const [payouts, setPayouts] = useState([]);
    const [payoutForm, setPayoutForm] = useState({
        amount: '',
        paymentMode: 'CASH',
        referenceNumber: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });

    const handleViewCommission = async (doctor) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${API_URL}/doctors/${doctor.id}/outstanding`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Also fetch payout history
            const payoutResponse = await axios.get(
                `${API_URL}/doctors/${doctor.id}/payouts`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSelectedDoctor(doctor);
            setCommissionData(response.data);
            setPayouts(payoutResponse.data.payouts || []);
            setActiveTab('OVERVIEW');
            setShowCommissionModal(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch commission data');
        }
    };

    const handleRecordPayout = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/doctors/${selectedDoctor.id}/payout`,
                payoutForm,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('Payout recorded successfully!');

            // Refresh data
            setPayoutForm({
                amount: '',
                paymentMode: 'CASH',
                referenceNumber: '',
                notes: '',
                paymentDate: new Date().toISOString().split('T')[0]
            });
            handleViewCommission(selectedDoctor); // Reload data
            setActiveTab('OVERVIEW');

        } catch (err) {
            alert(err.response?.data?.error || 'Failed to record payout');
        }
    };

    // Filter doctors
    const filteredDoctors = doctors.filter(doctor =>
        doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctor.phone?.includes(searchTerm) ||
        doctor.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination
    const indexOfLastDoctor = currentPage * doctorsPerPage;
    const indexOfFirstDoctor = indexOfLastDoctor - doctorsPerPage;
    const currentDoctors = filteredDoctors.slice(indexOfFirstDoctor, indexOfLastDoctor);
    const totalPages = Math.ceil(filteredDoctors.length / doctorsPerPage);

    const getCommissionDisplay = (doctor) => {
        if (doctor.commission_type === 'PERCENTAGE') {
            return `${doctor.commission_value}%`;
        } else if (doctor.commission_type === 'FIXED') {
            return `₹${parseFloat(doctor.commission_value).toFixed(2)}`;
        }
        return 'Not Set';
    };

    if (loading) {
        return <div className="doctors-container"><div className="loading">Loading doctors...</div></div>;
    }

    return (
        <div className="doctors-container">
            <div className="doctors-header">
                <div>
                    <h1>👨‍⚕️ Doctors Management</h1>
                    <p>Manage referring doctors and commission tracking</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancel' : '➕ Add Doctor'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Add/Edit Form */}
            {showForm && (
                <div className="doctor-form-card">
                    <h2>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Dr. John Smith"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Specialization</label>
                                <input
                                    type="text"
                                    value={formData.specialization}
                                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                    placeholder="Cardiologist"
                                />
                            </div>

                            <div className="form-group">
                                <label>Qualification</label>
                                <input
                                    type="text"
                                    value={formData.qualification}
                                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                    placeholder="MBBS, MD"
                                />
                            </div>

                            <div className="form-group">
                                <label>Registration Number</label>
                                <input
                                    type="text"
                                    value={formData.registration_number}
                                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                                    placeholder="MCI-12345"
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone *</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="9876543210"
                                    required
                                    pattern="[0-9]{10}"
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="doctor@example.com"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Clinic address"
                                    rows="2"
                                />
                            </div>

                            <div className="form-group">
                                <label>Commission Type *</label>
                                <select
                                    value={formData.commission_type}
                                    onChange={(e) => setFormData({ ...formData, commission_type: e.target.value })}
                                    required
                                >
                                    <option value="PERCENTAGE">Percentage (%)</option>
                                    <option value="FIXED">Fixed Amount (₹)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Commission Value *</label>
                                <input
                                    type="number"
                                    value={formData.commission_value}
                                    onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                                    placeholder={formData.commission_type === 'PERCENTAGE' ? '10' : '500'}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-save">
                                {editingDoctor ? '💾 Update Doctor' : '➕ Add Doctor'}
                            </button>
                            <button type="button" onClick={resetForm} className="btn-cancel">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="search-section">
                <input
                    type="text"
                    placeholder="🔍 Search by name, specialization, phone, or registration..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <div className="stats-badge">
                    {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Doctors Table */}
            <div className="doctors-table-container">
                <table className="doctors-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Specialization</th>
                            <th>Qualification</th>
                            <th>Registration #</th>
                            <th>Phone</th>
                            <th>Commission</th>
                            <th>Referrals</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentDoctors.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-data">
                                    {searchTerm ? 'No doctors found matching your search' : 'No doctors added yet'}
                                    {!searchTerm && (
                                        <button className="btn-add-first" onClick={() => setShowForm(true)}>
                                            Add First Doctor
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            currentDoctors.map(doctor => (
                                <tr key={doctor.id}>
                                    <td className="doctor-name">
                                        <div className="name-cell">
                                            <strong>{doctor.name}</strong>
                                            {doctor.email && <small>{doctor.email}</small>}
                                        </div>
                                    </td>
                                    <td>{doctor.specialization || '-'}</td>
                                    <td>{doctor.qualification || '-'}</td>
                                    <td className="reg-number">{doctor.registration_number || '-'}</td>
                                    <td>{doctor.phone}</td>
                                    <td className="commission-cell">
                                        <span className="commission-badge">
                                            {getCommissionDisplay(doctor)}
                                        </span>
                                    </td>
                                    <td className="referrals-cell">
                                        <span className="referral-count">{doctor.referral_count || 0}</span>
                                    </td>
                                    <td className="actions">
                                        <button
                                            onClick={() => handleViewCommission(doctor)}
                                            className="btn-view"
                                            title="View Commission"
                                        >
                                            💰
                                        </button>
                                        <button
                                            onClick={() => handleEdit(doctor)}
                                            className="btn-edit"
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(doctor.id)}
                                            className="btn-delete"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Commission & Payout Modal */}
            {showCommissionModal && selectedDoctor && commissionData && (
                <div className="modal-overlay">
                    <div className="modal-content large-modal">
                        <div className="modal-header">
                            <div>
                                <h2>Commission: {selectedDoctor.name}</h2>
                                <p className="subtitle">Manage commissions and payouts</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowCommissionModal(false)}>✕</button>
                        </div>

                        <div className="modal-body p-0">
                            {/* Tabs */}
                            <div className="tabs">
                                <button
                                    className={`tab ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('OVERVIEW')}
                                >
                                    📊 Overview
                                </button>
                                <button
                                    className={`tab ${activeTab === 'PAYOUTS' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('PAYOUTS')}
                                >
                                    💸 Payout History
                                </button>
                                <button
                                    className={`tab ${activeTab === 'NEW_PAYOUT' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('NEW_PAYOUT')}
                                >
                                    ➕ Record Payout
                                </button>
                            </div>

                            <div className="tab-content p-4">
                                {activeTab === 'OVERVIEW' && (
                                    <div className="overview-tab">
                                        <div className="stats-grid">
                                            <div className="stat-card">
                                                <label>Total Earned</label>
                                                <div className="value">₹{parseFloat(commissionData.total_earned || 0).toFixed(2)}</div>
                                            </div>
                                            <div className="stat-card">
                                                <label>Total Paid</label>
                                                <div className="value">₹{parseFloat(commissionData.total_paid || 0).toFixed(2)}</div>
                                            </div>
                                            <div className="stat-card highlight">
                                                <label>Outstanding Balance</label>
                                                <div className="value">₹{parseFloat(commissionData.outstanding_amount || 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                                ) : (
                                                    payouts.map((payout) => (
                                                        <tr key={payout.id}>
                                                            <td>{new Date(payout.payment_date).toLocaleDateString()}</td>
                                                            <td className="font-bold">₹{parseFloat(payout.amount).toFixed(2)}</td>
                                                            <td><span className="badge badge-info">{payout.payment_mode}</span></td>
                                                            <td>{payout.reference_number || '-'}</td>
                                                            <td>{payout.notes || '-'}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'NEW_PAYOUT' && (
                                    <div className="new-payout-tab">
                                        <div className="form-group">
                                            <label>Payout Amount (₹) *</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={payoutForm.amount}
                                                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                                                max={commissionData.outstanding_amount}
                                            />
                                            <small className="help-text">Max available: ₹{parseFloat(commissionData.outstanding_amount || 0).toFixed(2)}</small>
                                        </div>

                                        <div className="form-group">
                                            <label>Payment Date</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={payoutForm.paymentDate}
                                                onChange={(e) => setPayoutForm({ ...payoutForm, paymentDate: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Payment Mode</label>
                                            <select
                                                className="form-control"
                                                value={payoutForm.paymentMode}
                                                onChange={(e) => setPayoutForm({ ...payoutForm, paymentMode: e.target.value })}
                                            >
                                                <option value="CASH">Cash</option>
                                                <option value="ONLINE">Online Transfer / UPI</option>
                                                <option value="CHECK">Check</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Reference Number (Optional)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Transaction ID / Check No"
                                                value={payoutForm.referenceNumber}
                                                onChange={(e) => setPayoutForm({ ...payoutForm, referenceNumber: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Notes</label>
                                            <textarea
                                                className="form-control"
                                                rows="2"
                                                value={payoutForm.notes}
                                                onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                                            ></textarea>
                                        </div>

                                        <button
                                            className="btn btn-primary w-100 mt-3"
                                            onClick={handleRecordPayout}
                                            disabled={!payoutForm.amount || parseFloat(payoutForm.amount) <= 0}
                                        >
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

export default Doctors;
