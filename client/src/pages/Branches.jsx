import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { branchAPI, userAPI } from '../services/api';
import './Branches.css';

const Branches = () => {
    const [branches, setBranches] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('BRANCHES');

    // Forms
    const [showBranchForm, setShowBranchForm] = useState(false);
    const [showUserForm, setShowUserForm] = useState(false);

    const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
    const [userForm, setUserForm] = useState({
        name: '', email: '', password: '', role: 'TECHNICIAN', branchId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [branchRes, userRes] = await Promise.all([
                branchAPI.getAll(),
                userAPI.getAll()
            ]);
            setBranches(branchRes.data.branches || []);
            setUsers(userRes.data.users || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            alert('Failed to load branches and staff.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBranch = async (e) => {
        e.preventDefault();
        try {
            await branchAPI.create(branchForm);
            alert('Branch created successfully!');
            setBranchForm({ name: '', address: '', phone: '' });
            setShowBranchForm(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create branch');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await userAPI.create(userForm);
            alert('User created successfully!');
            setUserForm({ name: '', email: '', password: '', role: 'TECHNICIAN', branchId: '' });
            setShowUserForm(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create user');
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>🏢 Organization Management</h1>
                    <p>Manage multiple branches and staff members</p>
                </div>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'BRANCHES' ? 'active' : ''}`}
                    onClick={() => setActiveTab('BRANCHES')}
                >
                    Branches
                </button>
                <button
                    className={`tab ${activeTab === 'USERS' ? 'active' : ''}`}
                    onClick={() => setActiveTab('USERS')}
                >
                    Staff & Users
                </button>
            </div>

            <div className="tab-content" style={{ padding: '20px 0' }}>
                {activeTab === 'BRANCHES' && (
                    <>
                        <div className="actions-bar">
                            <button className="btn-primary" onClick={() => setShowBranchForm(true)}>
                                ➕ New Branch
                            </button>
                        </div>

                        <div className="grid-cards">
                            {branches.map(branch => (
                                <div key={branch.id} className={`card branch-card ${branch.is_main_branch ? 'main-branch' : ''}`}>
                                    <h3>{branch.name} {branch.is_main_branch && <span className="badge badge-success">MAIN</span>}</h3>
                                    <p>📍 {branch.address}</p>
                                    <p>📞 {branch.phone || 'N/A'}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'USERS' && (
                    <>
                        <div className="actions-bar">
                            <button className="btn-primary" onClick={() => setShowUserForm(true)}>
                                ➕ New Staff Member
                            </button>
                        </div>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Branch</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="font-bold">{user.name}</td>
                                        <td><span className="badge badge-info">{user.role}</span></td>
                                        <td>{user.branch_name || 'All Branches'}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            {/* Branch Modal */}
            {showBranchForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Add New Branch</h2>
                        <form onSubmit={handleCreateBranch}>
                            <div className="form-group">
                                <label>Branch Name *</label>
                                <input required type="text" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="text" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} />
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-save">Create</button>
                                <button type="button" className="btn-cancel" onClick={() => setShowBranchForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showUserForm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Add New User</h2>
                        <form onSubmit={handleCreateUser}>
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input required type="text" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Email *</label>
                                <input required type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Password *</label>
                                <input required type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Role *</label>
                                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="TECHNICIAN">Technician</option>
                                    <option value="RECEPTIONIST">Receptionist</option>
                                    <option value="RADIOLOGIST">Radiologist</option>
                                    <option value="ACCOUNTANT">Accountant</option>
                                    <option value="DOCTOR">Doctor</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Assign Branch</label>
                                <select value={userForm.branchId} onChange={e => setUserForm({ ...userForm, branchId: e.target.value })}>
                                    <option value="">-- Apply to All Branches --</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn-save">Create User</button>
                                <button type="button" className="btn-cancel" onClick={() => setShowUserForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branches;
