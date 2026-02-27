import React, { useState, useEffect } from 'react';
import { financeAPI, cashBookEntryAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { exportToCSV } from '../utils/exportCSV';
import './FinancialReports.css';

const FinancialReports = () => {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('SALE');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [cashSummary, setCashSummary] = useState(null);
    const [error, setError] = useState('');

    // Entry modal state
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [entryForm, setEntryForm] = useState({
        entry_date: new Date().toISOString().split('T')[0],
        type: 'CASH_OUT',
        particulars: '',
        reference: '',
        amount: '',
        payment_mode: 'CASH',
        category: '',
        notes: '',
    });
    const [entrySubmitting, setEntrySubmitting] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState(null);

    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('ALL');
    const [cbView, setCbView] = useState('ALL');

    useEffect(() => { fetchReportData(); }, [activeTab, startDate, endDate, paymentMode]);
    useEffect(() => { if (activeTab !== 'CASH') setCbView('ALL'); }, [activeTab]);

    /* ── Entry modal helpers ─────────────────────────────────── */
    const openNewEntry = (typeDefault = 'CASH_OUT') => {
        setEditingEntryId(null);
        setEntryForm({
            entry_date: new Date().toISOString().split('T')[0],
            type: typeDefault,
            particulars: '',
            reference: '',
            amount: '',
            payment_mode: typeDefault.startsWith('CASH') ? 'CASH' : 'BANK',
            category: '',
            notes: '',
        });
        setShowEntryModal(true);
    };

    const handleEntryTypeChange = (type) => {
        setEntryForm(f => ({ ...f, type, payment_mode: type.startsWith('CASH') ? 'CASH' : 'BANK' }));
    };

    const handleEntrySave = async () => {
        if (!entryForm.particulars.trim()) { toast.error('Particulars are required'); return; }
        if (!entryForm.amount || parseFloat(entryForm.amount) <= 0) { toast.error('Enter a valid amount'); return; }
        setEntrySubmitting(true);
        try {
            if (editingEntryId) {
                await cashBookEntryAPI.update(editingEntryId, entryForm);
                toast.success('Entry updated');
            } else {
                await cashBookEntryAPI.create(entryForm);
                toast.success('Entry recorded');
            }
            setShowEntryModal(false);
            fetchReportData();
        } catch (err) {
            toast.error('Failed to save entry');
        } finally {
            setEntrySubmitting(false);
        }
    };

    /* ── Data fetching ───────────────────────────────────────── */
    const fetchReportData = async () => {
        setLoading(true);
        setError('');
        try {
            let response;
            const params = { startDate, endDate };
            if (activeTab === 'GST') {
                response = await financeAPI.getGSTReport(params);
                setData(response.data.data || []);
                setCashSummary(null);
            } else if (activeTab === 'CASH') {
                params.paymentMode = paymentMode;
                response = await financeAPI.getCashBook(params);
                setData(response.data.data || []);
                setCashSummary(response.data.summary || null);
            } else if (activeTab === 'SALE') {
                response = await financeAPI.getSaleReport(params);
                setData(response.data.data || []);
                setCashSummary(null);
            }
        } catch (err) {
            setError('Failed to fetch report data. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fc = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

    /* ── Export ──────────────────────────────────────────────── */
    const handleExport = () => {
        if (data.length === 0) return;
        const tabLabels = { SALE: 'sale-report', GST: 'gst-report', CASH: 'cash-book' };
        const filename = `${tabLabels[activeTab]}_${startDate}_${endDate}`;
        const columnMap = {
            SALE: [
                { key: 'created_at', label: 'Date' }, { key: 'invoice_number', label: 'Invoice #' },
                { key: 'patient_name', label: 'Patient' }, { key: 'doctor_name', label: 'Doctor' },
                { key: 'total_amount', label: 'Total' }, { key: 'discount_amount', label: 'Discount' },
                { key: 'tax_amount', label: 'Tax' }, { key: 'net_amount', label: 'Net Amount' },
                { key: 'paid_amount', label: 'Paid' }, { key: 'balance_amount', label: 'Balance' },
                { key: 'payment_status', label: 'Status' }, { key: 'payment_mode', label: 'Mode' },
            ],
            GST: [
                { key: 'date', label: 'Date' }, { key: 'invoice_number', label: 'Invoice #' },
                { key: 'patient_name', label: 'Patient' }, { key: 'taxable_amount', label: 'Taxable Amount' },
                { key: 'tax_amount', label: 'GST Amount' }, { key: 'total_amount', label: 'Total Amount' },
            ],
            CASH: [
                { key: 'created_at', label: 'Date/Time' }, { key: 'reference', label: 'Reference' },
                { key: 'particulars', label: 'Particulars' }, { key: 'category', label: 'Category' },
                { key: 'payment_mode', label: 'Mode' }, { key: 'type', label: 'Type' },
                { key: 'cash_in', label: 'Cash In (₹)' }, { key: 'bank_in', label: 'Bank In (₹)' },
                { key: 'cash_out', label: 'Cash Out (₹)' }, { key: 'bank_out', label: 'Bank Out (₹)' },
            ],
        };
        exportToCSV(filename, data, columnMap[activeTab]);
    };

    /* ── Cash Book Double-Column ─────────────────────────────── */
    const renderCashBook = () => {
        const CATEGORY_ICON = {
            'Patient Receipt': '🏥', 'Due Collection': '📋',
            'Doctor Payout': '👨‍⚕️', 'Purchase': '📦', 'Manual Entry': '✏️',
        };
        const CATEGORY_COLOR = {
            'Patient Receipt': 'inward', 'Due Collection': 'inward-alt',
            'Doctor Payout': 'outward', 'Purchase': 'outward-alt', 'Manual Entry': 'outward',
        };

        return (
            <div className="cb-root">
                {/* Summary tiles */}
                {cashSummary && (
                    <div className="cb-summary-row">
                        <div className="cb-tile cb-tile-cashin">
                            <div className="cb-tile-icon">💵</div>
                            <div><div className="cb-tile-label">Cash Receipts</div><div className="cb-tile-value">{fc(cashSummary.totalCashIn)}</div></div>
                        </div>
                        <div className="cb-tile cb-tile-bankin">
                            <div className="cb-tile-icon">🏦</div>
                            <div><div className="cb-tile-label">Bank Receipts</div><div className="cb-tile-value">{fc(cashSummary.totalBankIn)}</div></div>
                        </div>
                        <div className="cb-tile cb-tile-cashout">
                            <div className="cb-tile-icon">📤</div>
                            <div><div className="cb-tile-label">Cash Payments</div><div className="cb-tile-value">{fc(cashSummary.totalCashOut)}</div></div>
                        </div>
                        <div className="cb-tile cb-tile-bankout">
                            <div className="cb-tile-icon">🏧</div>
                            <div><div className="cb-tile-label">Bank Payments</div><div className="cb-tile-value">{fc(cashSummary.totalBankOut)}</div></div>
                        </div>
                        <div className="cb-tile cb-tile-closing">
                            <div className="cb-tile-icon">📊</div>
                            <div>
                                <div className="cb-tile-label">Closing Cash</div>
                                <div className={`cb-tile-value ${cashSummary.closingCash < 0 ? 'text-danger' : ''}`}>{fc(cashSummary.closingCash)}</div>
                            </div>
                        </div>
                        <div className="cb-tile cb-tile-closing-bank">
                            <div className="cb-tile-icon">🏛️</div>
                            <div>
                                <div className="cb-tile-label">Closing Bank</div>
                                <div className={`cb-tile-value ${cashSummary.closingBank < 0 ? 'text-danger' : ''}`}>{fc(cashSummary.closingBank)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Double-column table */}
                <div className="cb-table-wrap">
                    <table className="cb-table">
                        <thead>
                            <tr className="cb-col-group-row">
                                <th colSpan="4" className="cb-group-header cb-group-dr">📥 Dr Side — Receipts (Cash In)</th>
                                <th colSpan="4" className="cb-group-header cb-group-cr">📤 Cr Side — Payments (Cash Out)</th>
                            </tr>
                            <tr>
                                <th className="cb-th-dr">Date</th>
                                <th className="cb-th-dr">Particulars</th>
                                <th className="cb-th-dr cb-num">Cash (₹)</th>
                                <th className="cb-th-dr cb-num">Bank (₹)</th>
                                <th className="cb-th-cr">Date</th>
                                <th className="cb-th-cr">Particulars</th>
                                <th className="cb-th-cr cb-num">Cash (₹)</th>
                                <th className="cb-th-cr cb-num">Bank (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let inward = data.filter(r => r.type === 'INWARD');
                                let outward = data.filter(r => r.type === 'OUTWARD');
                                if (cbView === 'CASH_RECEIPT') { inward = inward.filter(r => r.cash_in > 0); outward = []; }
                                if (cbView === 'BANK_RECEIPT') { inward = inward.filter(r => r.bank_in > 0); outward = []; }
                                if (cbView === 'CASH_PAYMENT') { inward = []; outward = outward.filter(r => r.cash_out > 0); }
                                if (cbView === 'BANK_PAYMENT') { inward = []; outward = outward.filter(r => r.bank_out > 0); }
                                const maxLen = Math.max(inward.length, outward.length, 1);

                                if (data.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="8" className="cb-no-data">No transactions found for the selected period</td>
                                        </tr>
                                    );
                                }

                                return Array.from({ length: maxLen }).map((_, i) => {
                                    const dr = inward[i];
                                    const cr = outward[i];
                                    return (
                                        <tr key={i} className={i % 2 === 0 ? 'cb-row-even' : 'cb-row-odd'}>
                                            {dr ? (
                                                <>
                                                    <td className="cb-td-dr cb-date">
                                                        {new Date(dr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </td>
                                                    <td className="cb-td-dr cb-particulars">
                                                        <span className="cb-cat-dot" data-cat={CATEGORY_COLOR[dr.category]} title={dr.category}>
                                                            {CATEGORY_ICON[dr.category] || '•'}
                                                        </span>
                                                        <span className="cb-main">{dr.particulars}</span>
                                                        <span className="cb-ref">{dr.reference} · <span className={`mode-badge ${dr.payment_mode}`}>{dr.payment_mode}</span></span>
                                                    </td>
                                                    <td className="cb-td-dr cb-num cb-cash-in">{dr.cash_in > 0 ? fc(dr.cash_in) : '—'}</td>
                                                    <td className="cb-td-dr cb-num cb-bank-in">{dr.bank_in > 0 ? fc(dr.bank_in) : '—'}</td>
                                                </>
                                            ) : (
                                                <td colSpan="4" className="cb-td-dr cb-empty" />
                                            )}
                                            {cr ? (
                                                <>
                                                    <td className="cb-td-cr cb-date">
                                                        {new Date(cr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </td>
                                                    <td className="cb-td-cr cb-particulars">
                                                        <span className="cb-cat-dot" data-cat={CATEGORY_COLOR[cr.category]} title={cr.category}>
                                                            {CATEGORY_ICON[cr.category] || '•'}
                                                        </span>
                                                        <span className="cb-main">{cr.particulars}</span>
                                                        <span className="cb-ref">{cr.reference} · <span className={`mode-badge ${cr.payment_mode}`}>{cr.payment_mode}</span></span>
                                                    </td>
                                                    <td className="cb-td-cr cb-num cb-cash-out">{cr.cash_out > 0 ? fc(cr.cash_out) : '—'}</td>
                                                    <td className="cb-td-cr cb-num cb-bank-out">{cr.bank_out > 0 ? fc(cr.bank_out) : '—'}</td>
                                                </>
                                            ) : (
                                                <td colSpan="4" className="cb-td-cr cb-empty" />
                                            )}
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                        {data.length > 0 && cashSummary && (
                            <tfoot>
                                <tr className="cb-total-row">
                                    <td className="cb-td-dr" colSpan="2"><strong>Total Receipts</strong></td>
                                    <td className="cb-td-dr cb-num"><strong>{fc(cashSummary.totalCashIn)}</strong></td>
                                    <td className="cb-td-dr cb-num"><strong>{fc(cashSummary.totalBankIn)}</strong></td>
                                    <td className="cb-td-cr" colSpan="2"><strong>Total Payments</strong></td>
                                    <td className="cb-td-cr cb-num"><strong>{fc(cashSummary.totalCashOut)}</strong></td>
                                    <td className="cb-td-cr cb-num"><strong>{fc(cashSummary.totalBankOut)}</strong></td>
                                </tr>
                                <tr className="cb-closing-row">
                                    <td className="cb-td-dr" colSpan="4">
                                        Closing Cash: <strong className={cashSummary.closingCash < 0 ? 'text-danger' : 'text-success'}>{fc(cashSummary.closingCash)}</strong>
                                    </td>
                                    <td className="cb-td-cr" colSpan="4">
                                        Closing Bank: <strong className={cashSummary.closingBank < 0 ? 'text-danger' : 'text-success'}>{fc(cashSummary.closingBank)}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Legend */}
                <div className="cb-legend">
                    <span><span className="cb-cat-dot" data-cat="inward">🏥</span> Patient Receipt</span>
                    <span><span className="cb-cat-dot" data-cat="inward-alt">📋</span> Due Collection</span>
                    <span><span className="cb-cat-dot" data-cat="outward">👨‍⚕️</span> Doctor Payout</span>
                    <span><span className="cb-cat-dot" data-cat="outward-alt">📦</span> Purchase</span>
                    <span><span className="cb-cat-dot" data-cat="outward">✏️</span> Manual Entry</span>
                </div>
            </div>
        );
    };

    /* ── GST Report ──────────────────────────────────────────── */
    const renderGSTReport = () => (
        <div className="report-table-wrapper">
            <table className="report-table">
                <thead><tr>
                    <th>Date</th><th>Invoice #</th><th>Patient Name</th>
                    <th>Taxable Amt</th><th>GST Amt</th><th>Total Amt</th>
                </tr></thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            <td>{new Date(row.date).toLocaleDateString()}</td>
                            <td className="highlight">{row.invoice_number}</td>
                            <td>{row.patient_name}</td>
                            <td>{fc(row.taxable_amount)}</td>
                            <td>{fc(row.tax_amount)}</td>
                            <td className="bold">{fc(row.total_amount)}</td>
                        </tr>
                    ))}
                    {data.length === 0 && <tr><td colSpan="6" className="no-data">No data found for the selected period</td></tr>}
                </tbody>
                {data.length > 0 && (
                    <tfoot><tr>
                        <td colSpan="3">Total</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.taxable_amount), 0))}</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.tax_amount), 0))}</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.total_amount), 0))}</td>
                    </tr></tfoot>
                )}
            </table>
        </div>
    );

    /* ── Sale Report ─────────────────────────────────────────── */
    const renderSaleReport = () => (
        <div className="report-table-wrapper">
            <table className="report-table">
                <thead><tr>
                    <th>Date</th><th>Invoice #</th><th>Patient</th><th>Doctor</th>
                    <th>Total</th><th>Disc</th><th>Tax</th><th>Net</th><th>Paid</th><th>Bal</th>
                </tr></thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            <td>{new Date(row.created_at).toLocaleDateString()}</td>
                            <td className="highlight">{row.invoice_number}</td>
                            <td>{row.patient_name}</td>
                            <td>{row.doctor_name || 'Walking'}</td>
                            <td>{fc(row.total_amount)}</td>
                            <td>{fc(row.discount_amount)}</td>
                            <td>{fc(row.tax_amount)}</td>
                            <td className="bold">{fc(row.net_amount)}</td>
                            <td className="text-success">{fc(row.paid_amount)}</td>
                            <td className={row.balance_amount > 0 ? 'text-danger' : ''}>{fc(row.balance_amount)}</td>
                        </tr>
                    ))}
                    {data.length === 0 && <tr><td colSpan="10" className="no-data">No data found for the selected period</td></tr>}
                </tbody>
                {data.length > 0 && (
                    <tfoot><tr>
                        <td colSpan="4">Grand Total</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.total_amount), 0))}</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.discount_amount), 0))}</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.tax_amount), 0))}</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.net_amount), 0))}</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.paid_amount), 0))}</td>
                        <td>{fc(data.reduce((s, r) => s + parseFloat(r.balance_amount), 0))}</td>
                    </tr></tfoot>
                )}
            </table>
        </div>
    );

    /* ── Main render ─────────────────────────────────────────── */
    return (
        <div className="finance-reports">
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1>💰 Financial Reports</h1>
                    <p>Analyze sales, taxation, and collections</p>
                </div>
                <div className="header-actions">
                    <button className="btn-export" onClick={handleExport} disabled={data.length === 0 || loading}>
                        📥 Export CSV
                    </button>
                    <button onClick={() => window.print()} className="btn btn-secondary">
                        <span>🖨️</span> Print Report
                    </button>
                    <button onClick={fetchReportData} className="btn btn-primary">
                        <span>🔄</span> Refresh
                    </button>
                </div>
            </div>

            <div className="reports-card">
                {/* Tabs + action buttons */}
                <div className="tabs-header">
                    <button className={`tab-btn ${activeTab === 'SALE' ? 'active' : ''}`} onClick={() => setActiveTab('SALE')}>
                        📈 Sale Report
                    </button>
                    <button className={`tab-btn ${activeTab === 'GST' ? 'active' : ''}`} onClick={() => setActiveTab('GST')}>
                        📝 GST Report
                    </button>
                    <button className={`tab-btn ${activeTab === 'CASH' ? 'active' : ''}`} onClick={() => setActiveTab('CASH')}>
                        💸 Cash Book
                    </button>
                    {activeTab === 'CASH' && (
                        <div className="cb-entry-btns">
                            <button className="cb-entry-btn cb-entry-cashout" onClick={() => openNewEntry('CASH_OUT')} title="Record Cash Payment">
                                📤 Cash Payment
                            </button>
                            <button className="cb-entry-btn cb-entry-bankout" onClick={() => openNewEntry('BANK_OUT')} title="Record Bank Payment">
                                🏧 Bank Payment
                            </button>
                            <button className="cb-entry-btn cb-entry-cashin" onClick={() => openNewEntry('CASH_IN')} title="Record Cash Receipt">
                                💵 Cash Receipt
                            </button>
                            <button className="cb-entry-btn cb-entry-bankin" onClick={() => openNewEntry('BANK_IN')} title="Record Bank Receipt">
                                🏦 Bank Receipt
                            </button>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="filters-bar">
                    <div className="filter-group">
                        <label>From Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    {activeTab === 'CASH' && (
                        <>
                            <div className="filter-group">
                                <label>Payment Mode</label>
                                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                                    <option value="ALL">All Modes</option>
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="UPI">UPI</option>
                                    <option value="ONLINE">Online</option>
                                    <option value="BANK">Bank</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>View</label>
                                <div className="cb-view-seg">
                                    {[
                                        { val: 'ALL', label: '📒 All' },
                                        { val: 'CASH_RECEIPT', label: '💵 Cash Receipt' },
                                        { val: 'BANK_RECEIPT', label: '🏦 Bank Receipt' },
                                        { val: 'CASH_PAYMENT', label: '📤 Cash Payment' },
                                        { val: 'BANK_PAYMENT', label: '🏧 Bank Payment' },
                                    ].map(({ val, label }) => (
                                        <button
                                            key={val}
                                            className={`cb-seg-btn ${cbView === val ? 'cb-seg-active' : ''}`}
                                            onClick={() => setCbView(val)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Content */}
                <div className="report-content">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner" />
                            <p>Generating report...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state"><p>{error}</p></div>
                    ) : (
                        <>
                            {activeTab === 'SALE' && renderSaleReport()}
                            {activeTab === 'GST' && renderGSTReport()}
                            {activeTab === 'CASH' && renderCashBook()}
                        </>
                    )}
                </div>
            </div>

            {/* ── Cash Book Entry Modal ──────────────────────────────── */}
            {showEntryModal && (
                <div className="cb-modal-overlay" onClick={() => setShowEntryModal(false)}>
                    <div className="cb-modal" onClick={e => e.stopPropagation()}>
                        <div className="cb-modal-header">
                            <h2>📝 {editingEntryId ? 'Edit' : 'New'} Cash Book Entry</h2>
                            <button className="cb-modal-close" onClick={() => setShowEntryModal(false)}>✕</button>
                        </div>

                        {/* Transaction type selector */}
                        <div className="cb-modal-type-row">
                            {[
                                { val: 'CASH_IN', label: '💵 Cash In', cls: 'type-cashin' },
                                { val: 'BANK_IN', label: '🏦 Bank In', cls: 'type-bankin' },
                                { val: 'CASH_OUT', label: '📤 Cash Out', cls: 'type-cashout' },
                                { val: 'BANK_OUT', label: '🏧 Bank Out', cls: 'type-bankout' },
                            ].map(({ val, label, cls }) => (
                                <button
                                    key={val}
                                    className={`cb-type-btn ${cls} ${entryForm.type === val ? 'selected' : ''}`}
                                    onClick={() => handleEntryTypeChange(val)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="cb-modal-body">
                            <div className="cb-modal-row">
                                <div className="cb-modal-field">
                                    <label>Date *</label>
                                    <input type="date" value={entryForm.entry_date}
                                        onChange={e => setEntryForm(f => ({ ...f, entry_date: e.target.value }))} />
                                </div>
                                <div className="cb-modal-field">
                                    <label>Amount (₹) *</label>
                                    <input type="number" min="0" step="0.01" placeholder="0.00"
                                        value={entryForm.amount}
                                        onChange={e => setEntryForm(f => ({ ...f, amount: e.target.value }))} />
                                </div>
                            </div>

                            <div className="cb-modal-field full">
                                <label>Particulars / Description *</label>
                                <input type="text" placeholder="e.g. Office Rent, Electricity Bill, Salary..."
                                    value={entryForm.particulars}
                                    onChange={e => setEntryForm(f => ({ ...f, particulars: e.target.value }))} />
                            </div>

                            <div className="cb-modal-row">
                                <div className="cb-modal-field">
                                    <label>Payment Mode</label>
                                    <select value={entryForm.payment_mode}
                                        onChange={e => setEntryForm(f => ({ ...f, payment_mode: e.target.value }))}>
                                        <option value="CASH">Cash</option>
                                        <option value="BANK">Bank Transfer</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">Card</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                </div>
                                <div className="cb-modal-field">
                                    <label>Category</label>
                                    <select value={entryForm.category}
                                        onChange={e => setEntryForm(f => ({ ...f, category: e.target.value }))}>
                                        <option value="">— Select Category —</option>
                                        <optgroup label="Expenses">
                                            <option>Rent</option>
                                            <option>Electricity / Utilities</option>
                                            <option>Salary / Staff</option>
                                            <option>Maintenance</option>
                                            <option>Consumables</option>
                                            <option>Equipment</option>
                                            <option>Transport</option>
                                            <option>Miscellaneous Expense</option>
                                        </optgroup>
                                        <optgroup label="Receipts">
                                            <option>Advance Deposit</option>
                                            <option>Loan Received</option>
                                            <option>Other Income</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div className="cb-modal-row">
                                <div className="cb-modal-field">
                                    <label>Reference / Voucher #</label>
                                    <input type="text" placeholder="e.g. CHQ-001, RTGS-123"
                                        value={entryForm.reference}
                                        onChange={e => setEntryForm(f => ({ ...f, reference: e.target.value }))} />
                                </div>
                                <div className="cb-modal-field">
                                    <label>Notes</label>
                                    <input type="text" placeholder="Optional note"
                                        value={entryForm.notes}
                                        onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
                                </div>
                            </div>
                        </div>

                        <div className="cb-modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowEntryModal(false)}>Cancel</button>
                            <button
                                className={`btn cb-save-btn ${entryForm.type.includes('OUT') ? 'cb-save-out' : 'cb-save-in'}`}
                                onClick={handleEntrySave}
                                disabled={entrySubmitting}
                            >
                                {entrySubmitting ? 'Saving...' : (editingEntryId ? '✔ Update Entry' : '+ Save Entry')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialReports;
