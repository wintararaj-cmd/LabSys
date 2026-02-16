import React, { useState, useEffect } from 'react';
import { inventoryAPI, branchAPI } from '../services/api';
import './Inventory.css';

const Inventory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [userRole, setUserRole] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [inventoryLogs, setInventoryLogs] = useState([]);
    const [adjustData, setAdjustData] = useState({
        item: null,
        adjustment: '',
        type: 'REMOVE',
        reason: ''
    });


    const [formData, setFormData] = useState({
        name: '',
        item_code: '',
        category: 'REAGENT',
        unit: 'ML',
        quantity: '',
        reorder_level: '',
        unit_price: '',
        supplier_name: '',
        supplier_contact: '',
        batch_number: '',
        expiry_date: '',
        branch_id: '',
        location: '',
        manufacturer: ''
    });

    const itemsPerPage = 10;
    const categories = ['ALL', 'REAGENT', 'CONSUMABLE', 'EQUIPMENT', 'CHEMICAL', 'OTHER'];
    const units = ['ML', 'L', 'MG', 'G', 'KG', 'PCS', 'BOX', 'VIAL'];

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setUserRole(user.role);
            if (user.role === 'ADMIN') {
                fetchBranches();
            }
        }
        fetchItems();
    }, [selectedBranch]);

    const fetchBranches = async () => {
        try {
            const response = await branchAPI.getAll();
            setBranches(response.data.branches || []);
        } catch (err) {
            console.error('Failed to fetch branches:', err);
        }
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await inventoryAPI.getAll({ branchId: selectedBranch });
            setItems(response.data.items || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch inventory');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await inventoryAPI.update(editingItem.id, formData);
                alert('Item updated successfully!');
            } else {
                await inventoryAPI.create(formData);
                alert('Item added successfully!');
            }

            resetForm();
            fetchItems();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save item');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            item_code: item.item_code,
            category: item.category,
            unit: item.unit,
            quantity: item.quantity,
            reorder_level: item.reorder_level,
            unit_price: item.unit_price,
            supplier_name: item.supplier_name || '',
            supplier_contact: item.supplier_contact || '',
            batch_number: item.batch_number || '',
            expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
            branch_id: item.branch_id || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }

        try {
            await inventoryAPI.delete(itemId);
            alert('Item deleted successfully!');
            fetchItems();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete item');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            item_code: '',
            category: 'REAGENT',
            unit: 'ML',
            quantity: '',
            reorder_level: '',
            unit_price: '',
            supplier_name: '',
            supplier_contact: '',
            batch_number: '',
            expiry_date: '',
            branch_id: '',
            location: '',
            manufacturer: ''
        });
        setEditingItem(null);
        setShowForm(false);
    };

    const handleOpenAdjust = (item) => {
        setAdjustData({
            item: item,
            adjustment: '',
            type: 'REMOVE',
            reason: ''
        });
        setShowAdjustModal(true);
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        try {
            await inventoryAPI.adjustStock(adjustData.item.id, {
                adjustment: adjustData.adjustment,
                type: adjustData.type,
                reason: adjustData.reason
            });
            setShowAdjustModal(false);
            fetchItems();
            alert('Stock adjusted successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to adjust stock');
        }
    };

    const handleViewLogs = async (itemId = null) => {
        try {
            const response = await inventoryAPI.getLogs({ itemId });
            setInventoryLogs(response.data.logs || []);
            setShowLogsModal(true);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
    };

    const getStockStatus = (quantity, reorderLevel) => {
        const q = parseFloat(quantity);
        const r = parseFloat(reorderLevel);
        if (q === 0) {
            return { status: 'OUT_OF_STOCK', label: 'Out of Stock', class: 'status-out' };
        } else if (q <= r) {
            return { status: 'LOW_STOCK', label: 'Low Stock', class: 'status-low' };
        } else {
            return { status: 'IN_STOCK', label: 'In Stock', class: 'status-ok' };
        }
    };

    const getExpiryStatus = (expiryDate) => {
        if (!expiryDate) return null;

        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
            return { label: 'Expired', class: 'expiry-expired', days: daysUntilExpiry };
        } else if (daysUntilExpiry <= 30) {
            return { label: 'Expiring Soon', class: 'expiry-warning', days: daysUntilExpiry };
        } else if (daysUntilExpiry <= 90) {
            return { label: 'Expiring', class: 'expiry-caution', days: daysUntilExpiry };
        }
        return null;
    };

    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const stats = {
        total: items.length,
        lowStock: items.filter(item => parseFloat(item.quantity) <= parseFloat(item.reorder_level) && parseFloat(item.quantity) > 0).length,
        outOfStock: items.filter(item => parseFloat(item.quantity) === 0).length,
        expiring: items.filter(item => {
            const status = getExpiryStatus(item.expiry_date);
            return status && status.days <= 30;
        }).length
    };

    if (loading) {
        return <div className="inventory-container"><div className="loading">Loading inventory...</div></div>;
    }

    return (
        <div className="inventory-container">
            <div className="inventory-header">
                <div>
                    <h1>📦 Inventory Management</h1>
                    <p>Track stock levels, expiry dates, and reorder points</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => handleViewLogs()}
                        style={{ marginRight: '10px' }}
                    >
                        📜 View History
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        {showForm ? '✕ Cancel' : '➕ Add Item'}
                    </button>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Items</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-label">Low Stock</div>
                        <div className="stat-value">{stats.lowStock}</div>
                    </div>
                </div>
                <div className="stat-card danger">
                    <div className="stat-icon">🚫</div>
                    <div className="stat-content">
                        <div className="stat-label">Out of Stock</div>
                        <div className="stat-value">{stats.outOfStock}</div>
                    </div>
                </div>
                <div className="stat-card alert">
                    <div className="stat-icon">⏰</div>
                    <div className="stat-content">
                        <div className="stat-label">Expiring Soon</div>
                        <div className="stat-value">{stats.expiring}</div>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="inventory-form-card">
                    <h2>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Item Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Item Code *</label>
                                <input
                                    type="text"
                                    value={formData.item_code}
                                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Category *</label>
                                <select
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
                                <label>Unit *</label>
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    required
                                >
                                    {units.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quantity *</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Reorder Level *</label>
                                <input
                                    type="number"
                                    value={formData.reorder_level}
                                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Unit Price (₹) *</label>
                                <input
                                    type="number"
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Batch Number</label>
                                <input
                                    type="text"
                                    value={formData.batch_number}
                                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Expiry Date</label>
                                <input
                                    type="date"
                                    value={formData.expiry_date}
                                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Supplier Name</label>
                                <input
                                    type="text"
                                    value={formData.supplier_name}
                                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Supplier Contact</label>
                                <input
                                    type="text"
                                    value={formData.supplier_contact}
                                    onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                                />
                            </div>
                            {userRole === 'ADMIN' && (
                                <div className="form-group">
                                    <label>Branch *</label>
                                    <select
                                        value={formData.branch_id}
                                        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Storage Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g. Fridge A, Shelf 2"
                                />
                            </div>
                            <div className="form-group">
                                <label>Manufacturer</label>
                                <input
                                    type="text"
                                    value={formData.manufacturer}
                                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-save">
                                {editingItem ? '💾 Update Item' : '➕ Add Item'}
                            </button>
                            <button type="button" onClick={resetForm} className="btn-cancel">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="filters-section">
                <input
                    type="text"
                    placeholder="🔍 Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                {userRole === 'ADMIN' && (
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All Branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Expiry</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map(item => {
                            const stockStatus = getStockStatus(item.quantity, item.reorder_level);
                            const expiryStatus = getExpiryStatus(item.expiry_date);
                            return (
                                <tr key={item.id}>
                                    <td>{item.item_code}</td>
                                    <td>{item.name}</td>
                                    <td>{item.category}</td>
                                    <td>{item.quantity} {item.unit}</td>
                                    <td>
                                        <span className={`stock-badge ${stockStatus.class}`}>{stockStatus.label}</span>
                                    </td>
                                    <td>
                                        {item.expiry_date ? (
                                            <div>
                                                {new Date(item.expiry_date).toLocaleDateString()}
                                                {expiryStatus && <div className={`expiry-badge ${expiryStatus.class}`}>{expiryStatus.label}</div>}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        <button onClick={() => handleEdit(item)} className="btn-edit" title="Edit">✏️</button>
                                        <button onClick={() => handleOpenAdjust(item)} className="btn-adjust" title="Adjust Stock">⚖️</button>
                                        <button onClick={() => handleViewLogs(item.id)} className="btn-logs" title="View History">📜</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Adjustment Modal */}
            {showAdjustModal && (
                <div className="inventory-modal-overlay">
                    <div className="inventory-modal">
                        <h3>Adjust Stock: {adjustData.item?.name}</h3>
                        <p>Current: {adjustData.item?.quantity} {adjustData.item?.unit}</p>
                        <form onSubmit={handleAdjustStock}>
                            <div className="form-group">
                                <label>Action</label>
                                <select
                                    value={adjustData.type}
                                    onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                                >
                                    <option value="ADD">➕ Add to Stock (Purchase/Return)</option>
                                    <option value="REMOVE">➖ Deduct from Stock (Usage/Waste)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quantity ({adjustData.item?.unit})</label>
                                <input
                                    type="number"
                                    value={adjustData.adjustment}
                                    onChange={(e) => setAdjustData({ ...adjustData, adjustment: e.target.value })}
                                    required
                                    min="0.01"
                                    step="0.01"
                                />
                            </div>
                            <div className="form-group">
                                <label>Reason</label>
                                <input
                                    type="text"
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                    placeholder="e.g. Daily usage, New shipment"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-save">Confirm</button>
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="btn-cancel">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logs Modal */}
            {showLogsModal && (
                <div className="inventory-modal-overlay">
                    <div className="inventory-modal x-large">
                        <div className="modal-header">
                            <h3>📜 Inventory Transaction History</h3>
                            <button onClick={() => setShowLogsModal(false)}>✕</button>
                        </div>
                        <div className="logs-table-container">
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Item</th>
                                        <th>Type</th>
                                        <th>Qty</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryLogs.map(log => (
                                        <tr key={log.id}>
                                            <td>{new Date(log.created_at).toLocaleString()}</td>
                                            <td>{log.item_name}</td>
                                            <td>
                                                <span className={`log-type ${log.type.toLowerCase()}`}>
                                                    {log.type === 'ADD' ? '➕ Received' :
                                                        log.type === 'REMOVE' ? '➖ Used' : '⭐ Initial'}
                                                </span>
                                            </td>
                                            <td>{log.quantity} {log.unit}</td>
                                            <td>{log.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
