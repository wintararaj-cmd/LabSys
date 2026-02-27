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
    const [gstData, setGstData] = useState(null);   // { outputRows, inputRows, slabSummary, summary }
    const [gstView, setGstView] = useState('SLAB'); // SLAB | OUTPUT | INPUT
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
                setGstData(response.data);   // { outputRows, inputRows, slabSummary, summary }
                setData([]);                 // not used for GST
                setCashSummary(null);
            } else if (activeTab === 'CASH') {
                params.paymentMode = paymentMode;
                response = await financeAPI.getCashBook(params);
                setData(response.data.data || []);
                setCashSummary(response.data.summary || null);
                setGstData(null);
            } else if (activeTab === 'SALE') {
                response = await financeAPI.getSaleReport(params);
                setData(response.data.data || []);
                setCashSummary(null);
                setGstData(null);
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
        const tabLabels = { SALE: 'sale-report', GST: 'gst-report', CASH: 'cash-book' };
        const filename = `${tabLabels[activeTab]}_${startDate}_${endDate}`;

        if (activeTab === 'GST' && gstData) {
            // Export both Output and Input rows
            const rows = [
                ...gstData.outputRows.map(r => ({ ...r, gst_type: 'GST OUT (Output)' })),
                ...gstData.inputRows.map(r => ({ ...r, gst_type: 'GST IN (Input)' })),
            ];
            exportToCSV(filename, rows, [
                { key: 'date', label: 'Date' }, { key: 'invoice_number', label: 'Invoice #' },
                { key: 'party_name', label: 'Party' }, { key: 'gst_type', label: 'Type' },
                { key: 'gst_rate', label: 'GST Rate (%)' },
                { key: 'taxable_amount', label: 'Taxable (₹)' }, { key: 'gst_amount', label: 'GST (₹)' },
            ]);
            return;
        }

        if (data.length === 0) return;
        const columnMap = {
            SALE: [
                { key: 'created_at', label: 'Date' }, { key: 'invoice_number', label: 'Invoice #' },
                { key: 'patient_name', label: 'Patient' }, { key: 'doctor_name', label: 'Doctor' },
                { key: 'total_amount', label: 'Total' }, { key: 'discount_amount', label: 'Discount' },
                { key: 'tax_amount', label: 'Tax' }, { key: 'net_amount', label: 'Net Amount' },
                { key: 'paid_amount', label: 'Paid' }, { key: 'balance_amount', label: 'Balance' },
                { key: 'payment_status', label: 'Status' }, { key: 'payment_mode', label: 'Mode' },
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
    const renderGSTReport = () => {
        if (!gstData) return <div className="loading-state"><div className="spinner" /><p>Loading GST data...</p></div>;
        const { outputRows = [], inputRows = [], slabSummary = [], summary = {} } = gstData;
        const net = summary.netLiability || 0;

        return (
            <div className="gst-root">

                {/* ── Summary cards */}
                <div className="gst-summary-row">
                    <div className="gst-tile gst-tile-out">
                        <div className="gst-tile-icon">📊</div>
                        <div>
                            <div className="gst-tile-label">GST Collected (Output)</div>
                            <div className="gst-tile-value">{fc(summary.totalOutputGST)}</div>
                            <div className="gst-tile-sub">Taxable: {fc(summary.totalOutputTaxable)}</div>
                        </div>
                    </div>
                    <div className="gst-tile gst-tile-in">
                        <div className="gst-tile-icon">💰</div>
                        <div>
                            <div className="gst-tile-label">GST Paid (Input)</div>
                            <div className="gst-tile-value">{fc(summary.totalInputGST)}</div>
                            <div className="gst-tile-sub">Taxable: {fc(summary.totalInputTaxable)}</div>
                        </div>
                    </div>
                    <div className={`gst-tile ${net >= 0 ? 'gst-tile-liability' : 'gst-tile-refund'}`}>
                        <div className="gst-tile-icon">{net >= 0 ? '⚖️' : '⬆️'}</div>
                        <div>
                            <div className="gst-tile-label">{net >= 0 ? 'Net GST Payable' : 'Net GST Refundable'}</div>
                            <div className="gst-tile-value">{fc(Math.abs(net))}</div>
                            <div className="gst-tile-sub">{net >= 0 ? 'GST Out − GST In' : 'Credit available'}</div>
                        </div>
                    </div>
                </div>

                {/* ── Slab-wise reconciliation */}
                {slabSummary.length > 0 && (
                    <div className="gst-slab-card">
                        <h3 className="gst-section-title">📊 GST Slab-wise Reconciliation</h3>
                        <div className="report-table-wrapper">
                            <table className="report-table gst-slab-table">
                                <thead>
                                    <tr>
                                        <th className="gst-th-slab">GST Rate</th>
                                        <th className="gst-th-out" colSpan="2">📊 Output (Collected from Patients)</th>
                                        <th className="gst-th-in" colSpan="2">💰 Input (Paid on Purchases)</th>
                                        <th className="gst-th-net">Net GST</th>
                                    </tr>
                                    <tr className="gst-th-sub-row">
                                        <th className="gst-th-slab"></th>
                                        <th className="gst-th-out">Taxable (₹)</th>
                                        <th className="gst-th-out">GST (₹)</th>
                                        <th className="gst-th-in">Taxable (₹)</th>
                                        <th className="gst-th-in">GST (₹)</th>
                                        <th className="gst-th-net">Payable (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slabSummary.map((row, i) => (
                                        <tr key={i}>
                                            <td><span className="gst-rate-badge">{row.rate}%</span></td>
                                            <td className="text-right">{fc(row.output_taxable)}</td>
                                            <td className="text-right gst-out-val">{fc(row.output_gst)}</td>
                                            <td className="text-right">{fc(row.input_taxable)}</td>
                                            <td className="text-right gst-in-val">{fc(row.input_gst)}</td>
                                            <td className={`text-right bold ${parseFloat(row.net_gst) < 0 ? 'text-success' : 'gst-net-positive'}`}>
                                                {fc(row.net_gst)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td><strong>Total</strong></td>
                                        <td className="text-right"><strong>{fc(summary.totalOutputTaxable)}</strong></td>
                                        <td className="text-right gst-out-val"><strong>{fc(summary.totalOutputGST)}</strong></td>
                                        <td className="text-right"><strong>{fc(summary.totalInputTaxable)}</strong></td>
                                        <td className="text-right gst-in-val"><strong>{fc(summary.totalInputGST)}</strong></td>
                                        <td className={`text-right bold ${net < 0 ? 'text-success' : 'gst-net-positive'}`}><strong>{fc(net)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {slabSummary.length === 0 && (
                    <div className="gst-no-slab">No GST entries found for this period. Ensure invoice items have GST percentages set.</div>
                )}

                {/* ── Transaction detail toggle */}
                <div className="gst-view-bar">
                    <span className="gst-view-label">Transaction Detail:</span>
                    <div className="cb-view-seg">
                        {[
                            { val: 'OUTPUT', label: '📊 Output GST (Collected)' },
                            { val: 'INPUT', label: '💰 Input GST (Paid)' },
                        ].map(({ val, label }) => (
                            <button key={val}
                                className={`cb-seg-btn ${gstView === val ? 'cb-seg-active' : ''}`}
                                onClick={() => setGstView(val)}
                            >{label}</button>
                        ))}
                    </div>
                </div>

                {/* Output GST */}
                {gstView === 'OUTPUT' && (
                    <div className="gst-detail-card">
                        <h3 className="gst-section-title">📊 Output GST — Collected from Patients</h3>
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead><tr>
                                    <th>Date</th><th>Invoice #</th><th>Patient</th>
                                    <th className="text-right">GST Rate</th>
                                    <th className="text-right">Taxable (₹)</th>
                                    <th className="text-right">GST Amount (₹)</th>
                                </tr></thead>
                                <tbody>
                                    {outputRows.length === 0 && <tr><td colSpan="6" className="no-data">No output GST transactions found</td></tr>}
                                    {outputRows.map((r, i) => (
                                        <tr key={i}>
                                            <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                                            <td className="highlight">{r.invoice_number}</td>
                                            <td>{r.party_name}</td>
                                            <td className="text-right"><span className="gst-rate-badge">{r.gst_rate}%</span></td>
                                            <td className="text-right">{fc(r.taxable_amount)}</td>
                                            <td className="text-right gst-out-val bold">{fc(r.gst_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {outputRows.length > 0 && (
                                    <tfoot><tr>
                                        <td colSpan="4"><strong>Total Output GST</strong></td>
                                        <td className="text-right"><strong>{fc(summary.totalOutputTaxable)}</strong></td>
                                        <td className="text-right gst-out-val"><strong>{fc(summary.totalOutputGST)}</strong></td>
                                    </tr></tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* Input GST */}
                {gstView === 'INPUT' && (
                    <div className="gst-detail-card">
                        <h3 className="gst-section-title">💰 Input GST — Paid on Purchases</h3>
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead><tr>
                                    <th>Date</th><th>Invoice #</th><th>Supplier</th>
                                    <th className="text-right">GST Rate</th>
                                    <th className="text-right">Taxable (₹)</th>
                                    <th className="text-right">GST Amount (₹)</th>
                                </tr></thead>
                                <tbody>
                                    {inputRows.length === 0 && <tr><td colSpan="6" className="no-data">No input GST transactions found</td></tr>}
                                    {inputRows.map((r, i) => (
                                        <tr key={i}>
                                            <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                                            <td className="highlight">{r.invoice_number}</td>
                                            <td>{r.party_name}</td>
                                            <td className="text-right"><span className="gst-rate-badge gst-rate-in">{r.gst_rate}%</span></td>
                                            <td className="text-right">{fc(r.taxable_amount)}</td>
                                            <td className="text-right gst-in-val bold">{fc(r.gst_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {inputRows.length > 0 && (
                                    <tfoot><tr>
                                        <td colSpan="4"><strong>Total Input GST</strong></td>
                                        <td className="text-right"><strong>{fc(summary.totalInputTaxable)}</strong></td>
                                        <td className="text-right gst-in-val"><strong>{fc(summary.totalInputGST)}</strong></td>
                                    </tr></tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };



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
