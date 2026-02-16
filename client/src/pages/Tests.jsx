import React, { useState, useEffect } from 'react';
import { testAPI } from '../services/api';
import './Tests.css';

function Tests() {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    const categories = ['ALL', 'Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Endocrinology', 'Immunology'];

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: 'Biochemistry',
        price: '',
        cost: '',
        tat_hours: '',
        normal_range_male: '',
        normal_range_female: '',
        unit: '',
        sample_type: 'Blood',
        gstPercentage: 0
    });

    useEffect(() => {
        loadTests();
    }, []);

    const loadTests = async () => {
        try {
            setLoading(true);
            const response = await testAPI.getAll();
            setTests(response.data.tests || []);
        } catch (err) {
            console.error('Failed to load tests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTest) {
                await testAPI.update(editingTest.id, formData);
                alert('Test updated successfully!');
            } else {
                await testAPI.create(formData);
                alert('Test added successfully!');
            }
            resetForm();
            loadTests();
        } catch (err) {
            alert('Failed to save test: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleEdit = (test) => {
        setEditingTest(test);
        setFormData({
            name: test.name,
            code: test.code,
            category: test.category,
            price: test.price,
            cost: test.cost,
            tat_hours: test.tat_hours,
            normal_range_male: test.normal_range_male || '',
            normal_range_female: test.normal_range_female || '',
            unit: test.unit || '',
            sample_type: test.sample_type,
            gstPercentage: test.gst_percentage || 0
        });
        setShowForm(true);
    };

    const handleDelete = async (testId) => {
        if (!window.confirm('Are you sure you want to delete this test?')) {
            return;
        }

        try {
            await testAPI.delete(testId);
            alert('Test deleted successfully!');
            loadTests();
        } catch (err) {
            alert('Failed to delete test: ' + (err.response?.data?.error || err.message));
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            category: 'Biochemistry',
            price: '',
            cost: '',
            tat_hours: '',
            normal_range_male: '',
            normal_range_female: '',
            unit: '',
            sample_type: 'Blood',
            gstPercentage: 0
        });
        setEditingTest(null);
        setShowForm(false);
    };

    const filteredTests = tests.filter(test => {
        const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            test.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || test.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const calculateMargin = (price, cost) => {
        const margin = ((price - cost) / price * 100).toFixed(1);
        return margin;
    };

    return (
        <div className="tests-container">
            <div className="page-header">
                <h1 className="page-title">Test Master</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancel' : '➕ Add Test'}
                </button>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <div className="card mb-3">
                    <h3 className="card-header">
                        {editingTest ? 'Edit Test' : 'Add New Test'}
                    </h3>
                    <form onSubmit={handleSubmit} className="test-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Test Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Complete Blood Count"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Test Code *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                    placeholder="CBC001"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <select
                                    className="form-select"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    {categories.filter(c => c !== 'ALL').map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Price (₹) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Cost (₹) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">TAT (Hours) *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.tat_hours}
                                    onChange={(e) => setFormData({ ...formData, tat_hours: e.target.value })}
                                    required
                                    min="1"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Sample Type *</label>
                                <select
                                    className="form-select"
                                    value={formData.sample_type}
                                    onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                                    required
                                >
                                    <option value="Blood">Blood</option>
                                    <option value="Urine">Urine</option>
                                    <option value="Stool">Stool</option>
                                    <option value="Serum">Serum</option>
                                    <option value="Plasma">Plasma</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">GST % *</label>
                                <select
                                    className="form-select"
                                    value={formData.gstPercentage}
                                    onChange={(e) => setFormData({ ...formData, gstPercentage: e.target.value })}
                                    required
                                >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Normal Range (Male)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.normal_range_male}
                                    onChange={(e) => setFormData({ ...formData, normal_range_male: e.target.value })}
                                    placeholder="13-17"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Normal Range (Female)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.normal_range_female}
                                    onChange={(e) => setFormData({ ...formData, normal_range_female: e.target.value })}
                                    placeholder="12-15"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Unit</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="g/dL"
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                {editingTest ? 'Update Test' : 'Add Test'}
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

            {/* Filters */}
            <div className="card mb-2">
                <div className="filters">
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="🔍 Search tests by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="form-select category-filter"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat === 'ALL' ? 'All Categories' : cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tests Table */}
            <div className="card">
                <h3 className="card-header">
                    Test Catalog
                    {!loading && <span className="badge badge-info ml-2">{filteredTests.length} tests</span>}
                </h3>

                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : filteredTests.length === 0 ? (
                    <div className="empty-state">
                        <p>No tests found</p>
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            Add First Test
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Test Name</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Cost</th>
                                    <th>Margin</th>
                                    <th>TAT</th>
                                    <th>GST</th>
                                    <th>Sample</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTests.map((test) => (
                                    <tr key={test.id}>
                                        <td>
                                            <span className="badge badge-secondary">{test.code}</span>
                                        </td>
                                        <td className="font-semibold">{test.name}</td>
                                        <td>
                                            <span className="category-badge">{test.category}</span>
                                        </td>
                                        <td className="price">₹{parseFloat(test.price).toFixed(2)}</td>
                                        <td className="cost">₹{parseFloat(test.cost).toFixed(2)}</td>
                                        <td>
                                            <span className="margin-badge">
                                                {calculateMargin(test.price, test.cost)}%
                                            </span>
                                        </td>
                                        <td>{test.tat_hours}h</td>
                                        <td>{test.gst_percentage}%</td>
                                        <td>{test.sample_type}</td>
                                        <td>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEdit(test)}
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleDelete(test.id)}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Tests;
