import React, { useState, useEffect } from 'react';
import { purchaseAPI, inventoryAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import './PurchaseInvoices.css';

const PurchaseInvoices = () => {
    const toast = useToast();
    const confirm = useConfirm();
    const [purchases, setPurchases] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [viewPurchase, setViewPurchase] = useState(null);
    const [error, setError] = useState('');

    const initialFormState = {
        invoiceNumber: '',
        supplierName: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'PAID',
        paymentMode: 'CASH',
        notes: '',
        items: [{ itemId: '', quantity: 1, unitPrice: 0, taxPercentage: 0, batchNumber: '', expiryDate: '' }]
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchData();
        fetchInventory();
    }, []);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setShowModal(false);
                setViewPurchase(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await purchaseAPI.getAll();
            setPurchases(response.data.purchases || []);
        } catch (err) {
            setError('Failed to fetch purchase invoices');
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async () => {
        try {
            const response = await inventoryAPI.getAll();
            setInventory(response.data.items || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { itemId: '', quantity: 1, unitPrice: 0, taxPercentage: 0, batchNumber: '', expiryDate: '' }]
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await purchaseAPI.update(formData.id, formData);
                toast.success('Purchase invoice updated successfully!');
            } else {
                await purchaseAPI.create(formData);
                toast.success('Purchase invoice recorded successfully!');
            }
            closeModal();
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save purchase');
        }
    };

    const handleEdit = async (id) => {
        try {
            const response = await purchaseAPI.getById(id);
            const { purchase, items } = response.data;
            setFormData({
                id: purchase.id,
                invoiceNumber: purchase.invoice_number,
                supplierName: purchase.supplier_name,
                purchaseDate: new Date(purchase.purchase_date).toISOString().split('T')[0],
                paymentStatus: purchase.payment_status,
                paymentMode: purchase.payment_mode,
                notes: purchase.notes,
                items: items.map(item => ({
                    itemId: item.item_id,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    taxPercentage: item.tax_percentage,
                    batchNumber: item.batch_number,
                    expiryDate: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : ''
                }))
            });
            setIsEditing(true);
            setShowModal(true);
        } catch (err) {
            toast.error('Failed to load purchase for editing');
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({
            title: 'Delete Purchase Invoice',
            message: 'This will permanently delete the purchase and reverse the stock quantities. This cannot be undone.',
            confirmText: 'Delete & Reverse Stock',
            variant: 'danger'
        });
        if (!ok) return;
        try {
            await purchaseAPI.delete(id);
            toast.success('Purchase deleted and stock reversed');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete purchase');
        }
    };

    const handleViewDetails = async (id) => {
        try {
            const response = await purchaseAPI.getById(id);
            setViewPurchase(response.data);
        } catch (err) {
            toast.error('Failed to load details');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setIsEditing(false);
        setFormData(initialFormState);
        setError('');
    };

    const calculateTotal = () => {
        return formData.items.reduce((total, item) => {
            const rowTotal = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
            const tax = (rowTotal * parseFloat(item.taxPercentage || 0)) / 100;
            return total + rowTotal + tax;
        }, 0);
    };

    return (
        <div className="purchase-container">
            <div className="page-header">
                <div>
                    <h1>📦 Purchase Invoices</h1>
                    <p>Track reagent and consumable purchases</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + New Purchase Entry
                </button>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="purchase-table-card">
                {loading ? (
                    <div className="p-4 text-center">Loading...</div>
                ) : (
                    <table className="purchase-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Supplier</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map(p => (
                                <tr key={p.id}>
                                    <td className="font-bold">{p.invoice_number}</td>
                                    <td>{p.supplier_name}</td>
                                    <td>{new Date(p.purchase_date).toLocaleDateString()}</td>
                                    <td className="font-bold">₹{parseFloat(p.net_amount).toLocaleString()}</td>
                                    <td>
                                        <span className={`status-pill ${p.payment_status}`}>
                                            {p.payment_status}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleViewDetails(p.id)}>View</button>
                                        <button className="btn btn-primary btn-sm" onClick={() => handleEdit(p.id)}>Modify</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && (
                                <tr><td colSpan="6" className="text-center p-4">No purchases found</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Entry/Edit Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2>{isEditing ? 'Modify Purchase Invoice' : 'Entry Purchase Invoice'}</h2>
                            <button className="close-btn" onClick={closeModal}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Invoice Number</label>
                                    <input name="invoiceNumber" required value={formData.invoiceNumber} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Supplier Name</label>
                                    <input name="supplierName" required value={formData.supplierName} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Purchase Date</label>
                                    <input type="date" name="purchaseDate" required value={formData.purchaseDate} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Payment Mode</label>
                                    <select name="paymentMode" value={formData.paymentMode} onChange={handleInputChange}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">Card</option>
                                    </select>
                                </div>
                            </div>

                            <div className="items-section">
                                <div className="section-header">
                                    <h3>Invoice Items</h3>
                                    <div className="total-display">Total: ₹{calculateTotal().toLocaleString()}</div>
                                </div>
                                <table className="items-entry-table">
                                    <thead>
                                        <tr>
                                            <th>Item from Inventory</th>
                                            <th>Qty</th>
                                            <th>Unit Price</th>
                                            <th>Tax %</th>
                                            <th>Batch #</th>
                                            <th>Expiry</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.items.map((item, index) => (
                                            <tr key={index}>
                                                <td>
                                                    <select required value={item.itemId} onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}>
                                                        <option value="">Select Item</option>
                                                        {inventory.map(inv => (
                                                            <option key={inv.id} value={inv.id}>{inv.name} ({inv.item_code})</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input type="number" step="0.01" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} style={{ width: '70px' }} />
                                                </td>
                                                <td>
                                                    <input type="number" step="0.01" required value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} style={{ width: '90px' }} />
                                                </td>
                                                <td>
                                                    <input type="number" step="0.1" value={item.taxPercentage} onChange={(e) => handleItemChange(index, 'taxPercentage', e.target.value)} style={{ width: '60px' }} />
                                                </td>
                                                <td>
                                                    <input value={item.batchNumber} onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)} placeholder="Batch" />
                                                </td>
                                                <td>
                                                    <input type="date" value={item.expiryDate} onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)} />
                                                </td>
                                                <td>
                                                    <button type="button" className="btn-remove" onClick={() => removeItem(index)}>&times;</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" className="btn-add" onClick={addItem}>+ Add More Items</button>
                            </div>

                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label>Notes</label>
                                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2"></textarea>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {isEditing ? 'Update Invoice & Adjust Stock' : 'Save Invoice & Update Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewPurchase && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Purchase Details: {viewPurchase.purchase.invoice_number}</h2>
                            <button className="close-btn" onClick={() => setViewPurchase(null)}>&times;</button>
                        </div>
                        <div className="details-info-grid">
                            <div className="info-item"><strong>Supplier:</strong> {viewPurchase.purchase.supplier_name}</div>
                            <div className="info-item"><strong>Date:</strong> {new Date(viewPurchase.purchase.purchase_date).toLocaleDateString()}</div>
                            <div className="info-item"><strong>Status:</strong> {viewPurchase.purchase.payment_status}</div>
                            <div className="info-item"><strong>Net Amount:</strong> ₹{parseFloat(viewPurchase.purchase.net_amount).toLocaleString()}</div>
                        </div>
                        <div className="items-view-section">
                            <table className="view-items-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Tax</th>
                                        <th>Batch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewPurchase.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.item_name}</td>
                                            <td>{item.quantity}</td>
                                            <td>₹{item.unit_price}</td>
                                            <td>{item.tax_percentage}%</td>
                                            <td>{item.batch_number}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setViewPurchase(null)}>Close</button>
                            <button className="btn btn-primary" onClick={() => { setViewPurchase(null); handleEdit(viewPurchase.purchase.id); }}>✏️ Edit This</button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default PurchaseInvoices;
