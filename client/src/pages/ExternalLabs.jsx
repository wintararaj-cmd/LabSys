import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExternalLabs.css';
import api from '../services/api';
import { useConfirm } from '../context/ConfirmContext';

const ExternalLabs = () => {
    const [labs, setLabs] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const confirm = useConfirm();
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
    });
    const [editingId, setEditingId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchLabs();
    }, []);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setShowModal(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const fetchLabs = async () => {
        try {
            const response = await api.get('/external-labs');
            setLabs(response.data);
        } catch (error) {
            console.error('Error fetching labs:', error);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/external-labs/${editingId}`, formData);
            } else {
                await api.post('/external-labs', formData);
            }
            setShowModal(false);
            setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
            setEditingId(null);
            fetchLabs();
        } catch (error) {
            console.error('Error saving lab:', error);
        }
    };

    const handleEdit = (lab) => {
        setFormData({
            name: lab.name,
            contact_person: lab.contact_person,
            phone: lab.phone,
            email: lab.email,
            address: lab.address
        });
        setEditingId(lab.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Delete External Lab',
            message: 'Are you sure you want to delete this lab? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!ok) return;
        try {
            await api.delete(`/external-labs/${id}`);
            fetchLabs();
        } catch (error) {
            console.error('Error deleting lab:', error);
        }
    };

    return (
        <div className="external-labs-container">
            <div className="page-header">
                <h1>External Reference Labs</h1>
                <button className="add-btn" onClick={() => {
                    setEditingId(null);
                    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
                    setShowModal(true);
                }}>
                    + Add New Lab
                </button>
            </div>

            <div className="labs-grid">
                {labs.map(lab => (
                    <div key={lab.id} className="lab-card">
                        <h3>{lab.name}</h3>
                        <div className="lab-details">
                            <p><strong>Contact:</strong> {lab.contact_person}</p>
                            <p><strong>Phone:</strong> {lab.phone}</p>
                            <p><strong>Email:</strong> {lab.email}</p>
                            <p><strong>Address:</strong> {lab.address}</p>
                        </div>
                        <div className="card-actions">
                            <button className="edit-btn" onClick={() => handleEdit(lab)}>Edit</button>
                            <button className="delete-btn" onClick={() => handleDelete(lab.id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editingId ? 'Edit Lab' : 'Add New Lab'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Lab Name*</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Contact Person</label>
                                <input
                                    type="text"
                                    name="contact_person"
                                    value={formData.contact_person}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">Cancel</button>
                                <button type="submit" className="save-btn">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExternalLabs;
