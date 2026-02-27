import React, { useState, useEffect } from 'react';
import { testAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { exportToCSV } from '../utils/exportCSV';
import './Tests.css';

function Tests() {
    const toast = useToast();
    const confirm = useConfirm();
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
        department: 'GENERAL',
        price: '',
        cost: '',
        tatHours: '',
        normalRangeMale: '',
        normalRangeFemale: '',
        unit: '',
        sampleType: 'Blood',
        gstPercentage: 0,
        isProfile: false,
        profileItems: []
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
                toast.success('Test updated successfully!');
            } else {
                await testAPI.create(formData);
                toast.success('Test added successfully!');
            }
            resetForm();
            loadTests();
        } catch (err) {
            toast.error('Failed to save test: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleEdit = (test) => {
        setEditingTest(test);
        setFormData({
            name: test.name,
            code: test.code,
            category: test.category,
            department: test.department || 'GENERAL',
            price: test.price,
            cost: test.cost,
            tatHours: test.tat_hours,
            normalRangeMale: test.normal_range_male || '',
            normalRangeFemale: test.normal_range_female || '',
            unit: test.unit || '',
            sampleType: test.sample_type,
            gstPercentage: parseFloat(test.gst_percentage) || 0,
            isProfile: test.is_profile || false,
            profileItems: test.profileItems ? test.profileItems.map(p => p.test_id) : []
        });
        setShowForm(true);
    };

    const handleDelete = async (testId) => {
        const ok = await confirm({
            title: 'Delete Test',
            message: 'Are you sure you want to delete this test? This action cannot be undone.',
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (!ok) return;
        try {
            await testAPI.delete(testId);
            toast.success('Test deleted successfully!');
            loadTests();
        } catch (err) {
            toast.error('Failed to delete test: ' + (err.response?.data?.error || err.message));
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            category: 'Biochemistry',
            department: 'GENERAL',
            price: '',
            cost: '',
            tatHours: '',
            normalRangeMale: '',
            normalRangeFemale: '',
            unit: '',
            sampleType: 'Blood',
            gstPercentage: 0,
            isProfile: false,
            profileItems: []
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
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                        className="btn-export"
                        onClick={() => exportToCSV('tests', tests, [
                            { key: 'code', label: 'Code' },
                            { key: 'name', label: 'Test Name' },
                            { key: 'category', label: 'Category' },
                            { key: 'department', label: 'Department' },
                            { key: 'price', label: 'Price (₹)' },
                            { key: 'cost', label: 'Cost (₹)' },
                            { key: 'unit', label: 'Unit' },
                            { key: 'gst_percentage', label: 'GST %' },
                            { key: 'is_active', label: 'Active' },
                        ])}
                        disabled={tests.length === 0}
                        title="Export test catalog to CSV"
                    >
                        📥 Export CSV
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? '✕ Cancel' : '➕ Add Test'}
                    </button>
                </div>
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

                            <div className="form-group">
                                <label className="form-label">Department / Modality *</label>
                                <select
                                    className="form-select"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    required
                                >
                                    <option value="GENERAL">General / Pathology</option>
                                    <option value="MRI">MRI</option>
                                    <option value="CT">CT Scan</option>
                                    <option value="USG">Ultrasound (USG)</option>
                                    <option value="XRAY">X-Ray</option>
                                    <option value="ECG">ECG</option>
                                    <option value="RADIOLOGY">Radiology (General)</option>
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
                                    value={formData.tatHours}
                                    onChange={(e) => setFormData({ ...formData, tatHours: e.target.value })}
                                    required
                                    min="1"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Sample Type *</label>
                                <select
                                    className="form-select"
                                    value={formData.sampleType}
                                    onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, gstPercentage: parseFloat(e.target.value) })}
                                    required
                                >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '30px' }}>
                                <input
                                    type="checkbox"
                                    id="isProfile"
                                    checked={formData.isProfile}
                                    onChange={(e) => setFormData({ ...formData, isProfile: e.target.checked })}
                                    style={{ width: '20px', height: '20px', marginRight: '10px' }}
                                />
                                <label htmlFor="isProfile" className="form-label" style={{ marginBottom: 0 }}>Is Profile/Panel</label>
                            </div>
                        </div>

                        {formData.isProfile && (
                            <div className="form-row">
                                <div className="form-group" style={{ width: '100%' }}>
                                    <label className="form-label">Select Sub-Tests for {formData.name || 'Profile'}</label>
                                    <div className="sub-tests-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                        {tests.filter(t => !t.is_profile && t.id !== editingTest?.id).map(t => (
                                            <div key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    id={`test-${t.id}`}
                                                    checked={formData.profileItems.includes(t.id)}
                                                    onChange={(e) => {
                                                        const newItems = e.target.checked
                                                            ? [...formData.profileItems, t.id]
                                                            : formData.profileItems.filter(id => id !== t.id);
                                                        setFormData({ ...formData, profileItems: newItems });
                                                    }}
                                                    style={{ width: '16px', height: '16px', marginRight: '8px' }}
                                                />
                                                <label htmlFor={`test-${t.id}`} style={{ fontSize: '14px', margin: 0, cursor: 'pointer' }}>{t.name}</label>
                                            </div>
                                        ))}
                                    </div>
                                    <small style={{ color: '#666' }}>Selected: {formData.profileItems.length} tests</small>
                                </div>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Normal Range (Male)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.normalRangeMale}
                                    onChange={(e) => setFormData({ ...formData, normalRangeMale: e.target.value })}
                                    placeholder="13-17"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Normal Range (Female)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.normalRangeFemale}
                                    onChange={(e) => setFormData({ ...formData, normalRangeFemale: e.target.value })}
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
                                    <th>Dept</th>
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
                                        <td className="font-semibold">
                                            {test.name}
                                            {test.is_profile && <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '10px' }}>PROFILE</span>}
                                        </td>
                                        <td>
                                            <span className="category-badge">{test.category}</span>
                                        </td>
                                        <td>
                                            <span style={{
                                                background: test.department === 'GENERAL' ? '#f3f4f6' : '#dbeafe',
                                                color: test.department === 'GENERAL' ? '#6b7280' : '#1e40af',
                                                padding: '2px 7px', borderRadius: 8, fontSize: 11, fontWeight: 700
                                            }}>{test.department || 'GENERAL'}</span>
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
