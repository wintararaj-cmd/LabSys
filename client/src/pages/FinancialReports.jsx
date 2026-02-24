import React, { useState, useEffect } from 'react';
import { financeAPI } from '../services/api';
import './FinancialReports.css';

const FinancialReports = () => {
    const [activeTab, setActiveTab] = useState('SALE');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState('');

    // Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('ALL');

    useEffect(() => {
        fetchReportData();
    }, [activeTab, startDate, endDate, paymentMode]);

    const fetchReportData = async () => {
        setLoading(true);
        setError('');
        try {
            let response;
            const params = { startDate, endDate };

            if (activeTab === 'GST') {
                response = await financeAPI.getGSTReport(params);
            } else if (activeTab === 'CASH') {
                params.paymentMode = paymentMode;
                response = await financeAPI.getCashBook(params);
            } else if (activeTab === 'SALE') {
                response = await financeAPI.getSaleReport(params);
            }
            setData(response.data.data || []);
        } catch (err) {
            setError('Failed to fetch report data. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const renderGSTReport = () => (
        <div className="report-table-wrapper">
            <table className="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Invoice #</th>
                        <th>Patient Name</th>
                        <th>Taxable Amt</th>
                        <th>GST Amt</th>
                        <th>Total Amt</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index}>
                            <td>{new Date(row.date).toLocaleDateString()}</td>
                            <td className="highlight">{row.invoice_number}</td>
                            <td>{row.patient_name}</td>
                            <td>{formatCurrency(row.taxable_amount)}</td>
                            <td>{formatCurrency(row.tax_amount)}</td>
                            <td className="bold">{formatCurrency(row.total_amount)}</td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan="6" className="no-data">No data found for the selected period</td></tr>
                    )}
                </tbody>
                {data.length > 0 && (
                    <tfoot>
                        <tr>
                            <td colSpan="3">Total</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.taxable_amount), 0))}</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.tax_amount), 0))}</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.total_amount), 0))}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    const renderCashBook = () => (
        <div className="report-table-wrapper">
            <table className="report-table">
                <thead>
                    <tr>
                        <th>Date / Time</th>
                        <th>Invoice #</th>
                        <th>Patient Name</th>
                        <th>Mode</th>
                        <th className="text-right">Amount (Inward)</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index}>
                            <td>{new Date(row.created_at).toLocaleString()}</td>
                            <td className="highlight">{row.invoice_number || row.reference}</td>
                            <td>{row.patient_name || row.particulars}</td>
                            <td><span className={`mode-badge ${row.payment_mode}`}>{row.payment_mode}</span></td>
                            <td className="text-right bold">{formatCurrency(row.amount)}</td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan="5" className="no-data">No data found for the selected period</td></tr>
                    )}
                </tbody>
                {data.length > 0 && (
                    <tfoot>
                        <tr>
                            <td colSpan="4">Total Collections</td>
                            <td className="text-right bold">{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.amount), 0))}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );

    const renderSaleReport = () => (
        <div className="report-table-wrapper">
            <table className="report-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Invoice #</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Total</th>
                        <th>Disc</th>
                        <th>Tax</th>
                        <th>Net</th>
                        <th>Paid</th>
                        <th>Bal</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr key={index}>
                            <td>{new Date(row.created_at).toLocaleDateString()}</td>
                            <td className="highlight">{row.invoice_number}</td>
                            <td>{row.patient_name}</td>
                            <td>{row.doctor_name || 'Walking'}</td>
                            <td>{formatCurrency(row.total_amount)}</td>
                            <td>{formatCurrency(row.discount_amount)}</td>
                            <td>{formatCurrency(row.tax_amount)}</td>
                            <td className="bold">{formatCurrency(row.net_amount)}</td>
                            <td className="text-success">{formatCurrency(row.paid_amount)}</td>
                            <td className={row.balance_amount > 0 ? "text-danger" : ""}>
                                {formatCurrency(row.balance_amount)}
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan="10" className="no-data">No data found for the selected period</td></tr>
                    )}
                </tbody>
                {data.length > 0 && (
                    <tfoot>
                        <tr>
                            <td colSpan="4">Grand Total</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.total_amount), 0))}</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.discount_amount), 0))}</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.tax_amount), 0))}</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.net_amount), 0))}</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.paid_amount), 0))}</td>
                            <td>{formatCurrency(data.reduce((sum, r) => sum + parseFloat(r.balance_amount), 0))}</td>
                        </tr>
                    </tfoot>
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
                    <button
                        className={`tab-btn ${activeTab === 'SALE' ? 'active' : ''}`}
                        onClick={() => setActiveTab('SALE')}
                    >
                        📈 Sale Report
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'GST' ? 'active' : ''}`}
                        onClick={() => setActiveTab('GST')}
                    >
                        📝 GST Report
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'CASH' ? 'active' : ''}`}
                        onClick={() => setActiveTab('CASH')}
                    >
                        💸 Cash Book
                    </button>
                </div>

                <div className="filters-bar">
                    <div className="filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    {activeTab === 'CASH' && (
                        <div className="filter-group">
                            <label>Payment Mode</label>
                            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
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
                            <div className="spinner"></div>
                            <p>Generating report...</p>
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <p>{error}</p>
                        </div>
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
