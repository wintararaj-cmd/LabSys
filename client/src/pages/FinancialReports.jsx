import React, { useState, useEffect } from 'react';
import { financeAPI } from '../services/api';
import { exportToCSV } from '../utils/exportCSV';
import './FinancialReports.css';

const FinancialReports = () => {
    const [activeTab, setActiveTab] = useState('SALE');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [cashSummary, setCashSummary] = useState(null);
    const [error, setError] = useState('');

    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('ALL');

    useEffect(() => { fetchReportData(); }, [activeTab, startDate, endDate, paymentMode]);

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

    /* ── Cash Book Double-Column Renderer ──────────────────────────── */
    const renderCashBook = () => {
        const CATEGORY_ICON = {
            'Patient Receipt': '🏥',
            'Due Collection': '📋',
            'Doctor Payout': '👨‍⚕️',
            'Purchase': '📦',
        };
        const CATEGORY_COLOR = {
            'Patient Receipt': 'inward',
            'Due Collection': 'inward-alt',
            'Doctor Payout': 'outward',
            'Purchase': 'outward-alt',
        };

        return (
            <div className="cb-root">
                {/* ── Summary tiles ───────────────────────── */}
                {cashSummary && (
                    <div className="cb-summary-row">
                        <div className="cb-tile cb-tile-cashin">
                            <div className="cb-tile-icon">💵</div>
                            <div>
                                <div className="cb-tile-label">Cash Receipts</div>
                                <div className="cb-tile-value">{fc(cashSummary.totalCashIn)}</div>
                            </div>
                        </div>
                        <div className="cb-tile cb-tile-bankin">
                            <div className="cb-tile-icon">🏦</div>
                            <div>
                                <div className="cb-tile-label">Bank Receipts</div>
                                <div className="cb-tile-value">{fc(cashSummary.totalBankIn)}</div>
                            </div>
                        </div>
                        <div className="cb-tile cb-tile-cashout">
                            <div className="cb-tile-icon">📤</div>
                            <div>
                                <div className="cb-tile-label">Cash Payments</div>
                                <div className="cb-tile-value">{fc(cashSummary.totalCashOut)}</div>
                            </div>
                        </div>
                        <div className="cb-tile cb-tile-bankout">
                            <div className="cb-tile-icon">🏧</div>
                            <div>
                                <div className="cb-tile-label">Bank Payments</div>
                                <div className="cb-tile-value">{fc(cashSummary.totalBankOut)}</div>
                            </div>
                        </div>
                        <div className="cb-tile cb-tile-closing">
                            <div className="cb-tile-icon">📊</div>
                            <div>
                                <div className="cb-tile-label">Closing Cash</div>
                                <div className={`cb-tile-value ${cashSummary.closingCash < 0 ? 'text-danger' : ''}`}>
                                    {fc(cashSummary.closingCash)}
                                </div>
                            </div>
                        </div>
                        <div className="cb-tile cb-tile-closing-bank">
                            <div className="cb-tile-icon">🏛️</div>
                            <div>
                                <div className="cb-tile-label">Closing Bank</div>
                                <div className={`cb-tile-value ${cashSummary.closingBank < 0 ? 'text-danger' : ''}`}>
                                    {fc(cashSummary.closingBank)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Double-column table ─────────────────── */}
                <div className="cb-table-wrap">
                    <table className="cb-table">
                        <thead>
                            {/* Column group headers */}
                            <tr className="cb-col-group-row">
                                <th colSpan="4" className="cb-group-header cb-group-dr">
                                    📥 Dr Side — Receipts (Cash In)
                                </th>
                                <th colSpan="4" className="cb-group-header cb-group-cr">
                                    📤 Cr Side — Payments (Cash Out)
                                </th>
                            </tr>
                            <tr>
                                {/* DR side */}
                                <th className="cb-th-dr">Date</th>
                                <th className="cb-th-dr">Particulars</th>
                                <th className="cb-th-dr cb-num">Cash (₹)</th>
                                <th className="cb-th-dr cb-num">Bank (₹)</th>
                                {/* CR side */}
                                <th className="cb-th-cr">Date</th>
                                <th className="cb-th-cr">Particulars</th>
                                <th className="cb-th-cr cb-num">Cash (₹)</th>
                                <th className="cb-th-cr cb-num">Bank (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const inward = data.filter(r => r.type === 'INWARD');
                                const outward = data.filter(r => r.type === 'OUTWARD');
                                const maxLen = Math.max(inward.length, outward.length, 1);

                                if (data.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="8" className="cb-no-data">
                                                No transactions found for the selected period
                                            </td>
                                        </tr>
                                    );
                                }

                                return Array.from({ length: maxLen }).map((_, i) => {
                                    const dr = inward[i];
                                    const cr = outward[i];
                                    return (
                                        <tr key={i} className={i % 2 === 0 ? 'cb-row-even' : 'cb-row-odd'}>
                                            {/* DR side */}
                                            {dr ? (
                                                <>
                                                    <td className="cb-td-dr cb-date">
                                                        {new Date(dr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </td>
                                                    <td className="cb-td-dr cb-particulars">
                                                        <span className="cb-cat-dot" data-cat={CATEGORY_COLOR[dr.category]} title={dr.category}>
                                                            {CATEGORY_ICON[dr.category]}
                                                        </span>
                                                        <span className="cb-main">{dr.particulars}</span>
                                                        <span className="cb-ref">{dr.reference} · <span className={`mode-badge ${dr.payment_mode}`}>{dr.payment_mode}</span></span>
                                                    </td>
                                                    <td className="cb-td-dr cb-num cb-cash-in">
                                                        {dr.cash_in > 0 ? fc(dr.cash_in) : '—'}
                                                    </td>
                                                    <td className="cb-td-dr cb-num cb-bank-in">
                                                        {dr.bank_in > 0 ? fc(dr.bank_in) : '—'}
                                                    </td>
                                                </>
                                            ) : (
                                                <td colSpan="4" className="cb-td-dr cb-empty" />
                                            )}
                                            {/* CR side */}
                                            {cr ? (
                                                <>
                                                    <td className="cb-td-cr cb-date">
                                                        {new Date(cr.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </td>
                                                    <td className="cb-td-cr cb-particulars">
                                                        <span className="cb-cat-dot" data-cat={CATEGORY_COLOR[cr.category]} title={cr.category}>
                                                            {CATEGORY_ICON[cr.category]}
                                                        </span>
                                                        <span className="cb-main">{cr.particulars}</span>
                                                        <span className="cb-ref">{cr.reference} · <span className={`mode-badge ${cr.payment_mode}`}>{cr.payment_mode}</span></span>
                                                    </td>
                                                    <td className="cb-td-cr cb-num cb-cash-out">
                                                        {cr.cash_out > 0 ? fc(cr.cash_out) : '—'}
                                                    </td>
                                                    <td className="cb-td-cr cb-num cb-bank-out">
                                                        {cr.bank_out > 0 ? fc(cr.bank_out) : '—'}
                                                    </td>
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
                                        <span>Closing Cash Balance: <strong className={cashSummary.closingCash < 0 ? 'text-danger' : 'text-success'}>{fc(cashSummary.closingCash)}</strong></span>
                                    </td>
                                    <td className="cb-td-cr" colSpan="4">
                                        <span>Closing Bank Balance: <strong className={cashSummary.closingBank < 0 ? 'text-danger' : 'text-success'}>{fc(cashSummary.closingBank)}</strong></span>
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
                </div>
            </div>
        );
    };

    /* ── GST Report ─────────────────────────────────────────────────── */
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

    /* ── Sale Report ─────────────────────────────────────────────────── */
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

    return (
        <div className="finance-reports">
            <div className="page-header">
                <div>
                    <h1>💰 Financial Reports</h1>
                    <p>Analyze sales, taxation, and collections</p>
                </div>
                <div className="header-actions">
                    <button className="btn-export" onClick={handleExport} disabled={data.length === 0 || loading}
                        title={`Export ${activeTab === 'SALE' ? 'Sale Report' : activeTab === 'GST' ? 'GST Report' : 'Cash Book'} to CSV`}>
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
                </div>

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
                        <div className="filter-group">
                            <label>Payment Mode</label>
                            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                                <option value="ALL">All Modes</option>
                                <option value="CASH">Cash</option>
                                <option value="CARD">Card</option>
                                <option value="UPI">UPI</option>
                                <option value="ONLINE">Online</option>
                            </select>
                        </div>
                    )}
                </div>

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
        </div>
    );
};

export default FinancialReports;
