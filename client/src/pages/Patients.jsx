import React, { useState, useEffect } from 'react';
import { patientAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import './Patients.css';

function Patients() {
    const toast = useToast();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editingPatient, setEditingPatient] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        loadPatients();
    }, [currentPage, searchTerm]);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setShowViewModal(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const loadPatients = async () => {
        try {
            setLoading(true);
            const response = await patientAPI.getAll({
                page: currentPage,
                limit: 10,
                search: searchTerm
            });
            setPatients(response.data.patients || []);
            setTotalPages(response.data.totalPages || 1);
            setError('');
        } catch (err) {
            setError('Failed to load patients');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPatient) {
                await patientAPI.update(editingPatient.id, formData);
                toast.success('Patient details updated successfully!');
            } else {
                await patientAPI.create(formData);
                toast.success('Patient registered successfully!');
            }

            resetForm();
            loadPatients();
        } catch (err) {
            toast.error('Operation failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingPatient(null);
        setFormData({
            name: '',
            age: '',
            gender: 'Male',
            phone: '',
            email: '',
            address: ''
        });
    };

    const handleEdit = (patient) => {
        setEditingPatient(patient);
        setFormData({
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            phone: patient.phone,
            email: patient.email || '',
            address: patient.address || ''
        });
        setShowForm(true);
    };

    const handleView = (patient) => {
        setSelectedPatient(patient);
        setShowViewModal(true);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="patients-container">
            <div className="page-header">
                <h1 className="page-title">Patient Management</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        if (showForm) resetForm();
                        else setShowForm(true);
                    }}
                >
                    {showForm ? '✕ Cancel' : '➕ New Patient'}
                </button>
            </div>

            {/* Registration Form */}
            {showForm && (
                <div className="card mb-3">
                    <h3 className="card-header">{editingPatient ? 'Edit Patient Details' : 'Register New Patient'}</h3>
                    <form onSubmit={handleSubmit} className="patient-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Age *</label>
                                <input
                                    type="number"
                                    name="age"
                                    className="form-input"
                                    value={formData.age}
                                    onChange={handleInputChange}
                                    required
                                    min="0"
                                    max="150"
                                    placeholder="35"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select
                                    name="gender"
                                    className="form-select"
                                    value={formData.gender}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Phone *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="9876543210"
                                    pattern="[0-9]{10}"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="patient@example.com"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <textarea
                                name="address"
                                className="form-input"
                                value={formData.address}
                                onChange={handleInputChange}
                                rows="2"
                                placeholder="Complete address"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                {editingPatient ? 'Update Patient' : 'Register Patient'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={resetForm}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search Bar */}
            <div className="card mb-2">
                <div className="search-bar">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Search by name, UHID, or phone..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="alert alert-error mb-2">
                    {error}
                </div>
            )}

            {/* Patients Table */}
            <div className="card">
                <h3 className="card-header">
                    Registered Patients
                    {!loading && <span className="badge badge-info ml-2">{patients.length} patients</span>}
                </h3>

                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="empty-state">
                        <p>No patients found</p>
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            Register First Patient
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>UHID</th>
                                        <th>Name</th>
                                        <th>Age</th>
                                        <th>Gender</th>
                                        <th>Phone</th>
                                        <th>Registered</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.map((patient) => (
                                        <tr key={patient.id}>
                                            <td>
                                                <span className="badge badge-info">{patient.uhid}</span>
                                            </td>
                                            <td className="font-semibold">{patient.name}</td>
                                            <td>{patient.age}</td>
                                            <td>
                                                <span className={`gender-badge ${patient.gender.toLowerCase()}`}>
                                                    {patient.gender}
                                                </span>
                                            </td>
                                            <td>{patient.phone}</td>
                                            <td>{new Date(patient.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <button
                                                    className="btn-icon"
                                                    title="View Details"
                                                    onClick={() => handleView(patient)}
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    className="btn-icon"
                                                    title="Edit"
                                                    onClick={() => handleEdit(patient)}
                                                >
                                                    ✏️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    ← Previous
                                </button>
                                <span className="page-info">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* View Patient Modal */}
            {showViewModal && selectedPatient && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Patient Profile</h3>
                            <button className="close-btn" onClick={() => setShowViewModal(false)}>✕</button>
                        </div>
                        <div className="modal-body profile-view">
                            <div className="profile-header">
                                <div className={`avatar ${selectedPatient.gender.toLowerCase()}`}>
                                    {selectedPatient.name.charAt(0)}
                                </div>
                                <div className="profile-main">
                                    <h2>{selectedPatient.name}</h2>
                                    <span className="badge badge-info">{selectedPatient.uhid}</span>
                                </div>
                            </div>

                            <div className="profile-grid">
                                <div className="info-group">
                                    <label>Age / Gender</label>
                                    <p>{selectedPatient.age} years / {selectedPatient.gender}</p>
                                </div>
                                <div className="info-group">
                                    <label>Phone Number</label>
                                    <p>{selectedPatient.phone}</p>
                                </div>
                                <div className="info-group">
                                    <label>Email Address</label>
                                    <p>{selectedPatient.email || 'Not provided'}</p>
                                </div>
                                <div className="info-group full-width">
                                    <label>Residential Address</label>
                                    <p>{selectedPatient.address || 'No address registered'}</p>
                                </div>
                                <div className="info-group">
                                    <label>Registration Date</label>
                                    <p>{new Date(selectedPatient.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                            <button className="btn btn-primary" onClick={() => {
                                setShowViewModal(false);
                                handleEdit(selectedPatient);
                            }}>Edit Profile</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Patients;
