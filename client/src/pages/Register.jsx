import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Login.css'; // Reuse login styles

const Register = () => {
    const [formData, setFormData] = useState({
        labName: '',
        licenseNumber: '',
        gstNumber: '',
        contactEmail: '',
        contactPhone: '',
        address: '',
        adminName: '',
        adminEmail: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            await api.post('/auth/register', formData);
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card" style={{ maxWidth: '600px', width: '90%' }}>
                <div className="login-header">
                    <h1>🧪 LabSys</h1>
                    <p>Register your Laboratory for SaaS Access</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="form-group">
                            <label>Laboratory Name *</label>
                            <input name="labName" type="text" required value={formData.labName} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Admin Full Name *</label>
                            <input name="adminName" type="text" required value={formData.adminName} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>License Number</label>
                            <input name="licenseNumber" type="text" value={formData.licenseNumber} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>GST Number (India)</label>
                            <input name="gstNumber" type="text" value={formData.gstNumber} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Contact Phone</label>
                            <input name="contactPhone" type="text" value={formData.contactPhone} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Contact/Labs Email</label>
                            <input name="contactEmail" type="email" value={formData.contactEmail} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Admin Login Email *</label>
                            <input name="adminEmail" type="email" required value={formData.adminEmail} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Laboratory Address</label>
                            <input name="address" type="text" value={formData.address} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Password *</label>
                            <input name="password" type="password" required value={formData.password} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password *</label>
                            <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} />
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Creating Account...' : '🚀 Register My Lab'}
                    </button>
                </form>

                <div className="login-footer">
                    Already have an account? <Link to="/login">Login here</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
