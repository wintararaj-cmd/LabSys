import React, { useState, useEffect } from 'react';
import { invoiceAPI, patientAPI, testAPI, doctorAPI, introducerAPI } from '../services/api';
import './Billing.css';

function Billing() {
    const [invoices, setInvoices] = useState([]);
    const [patients, setPatients] = useState([]);
    const [tests, setTests] = useState([]);
    const [doctors, setDoctors] = useState([]);       // referring doctors (is_introducer=false)
    const [introducers, setIntroducers] = useState([]); // introducers (is_introducer=true)
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        patient_id: '',
        doctor_id: '',
        introducer_id: '',      // FK to a doctor record
        introducer_raw: '',     // 'SELF' or '' when no introducer doctor selected
        department: 'GENERAL',
        discount_amount: 0,
        payment_mode: 'CASH',
        paid_amount: 0,
        selectedTests: []
    });

    const [patientSearch, setPatientSearch] = useState('');
    const [patientResults, setPatientResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [newPatient, setNewPatient] = useState({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        address: ''
    });

    const [calculations, setCalculations] = useState({
        total_amount: 0,
        discount_amount: 0,
        tax_amount: 0,
        cgst: 0,
        sgst: 0,
        net_amount: 0,
        balance_amount: 0
    });

    const [commissionPreview, setCommissionPreview] = useState(null);
    const [commissionLoading, setCommissionLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [formData.selectedTests, formData.discount_amount, formData.paid_amount]);

    // Filter tests by their stored department column (exact match)
    const getTestsForDepartment = (dept) => {
        if (!tests.length) return [];
        if (!dept || dept === 'GENERAL') {
            return tests.filter(t => !t.department || t.department === 'GENERAL');
        }
        if (dept === 'RADIOLOGY') {
            // RADIOLOGY (All) — show all non-GENERAL tests
            return tests.filter(t => t.department && t.department !== 'GENERAL');
        }
        return tests.filter(t => t.department === dept);
    };

    const filteredTests = getTestsForDepartment(formData.department);

    // Live commission preview whenever relevant fields change
    useEffect(() => {
        const timer = setTimeout(() => fetchCommissionPreview(), 600);
        return () => clearTimeout(timer);
    }, [formData.doctor_id, formData.introducer_id, formData.introducer_raw, formData.department, calculations.net_amount]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [invoicesRes, testsRes, doctorsRes, introducersRes] = await Promise.all([
                invoiceAPI.getAll({ limit: 10 }),
                testAPI.getAll(),
                doctorAPI.getAll(),
                introducerAPI.getAll()
            ]);

            setInvoices(invoicesRes.data.invoices || []);
            setTests(testsRes.data.tests || []);
            setDoctors(doctorsRes.data.doctors || []);
            setIntroducers(introducersRes.data.introducers || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCommissionPreview = async () => {
        if (!formData.doctor_id || calculations.net_amount <= 0) {
            setCommissionPreview(null);
            return;
        }
        try {
            setCommissionLoading(true);
            const res = await invoiceAPI.previewCommission({
                doctorId: formData.doctor_id,
                introducerId: formData.introducer_id || null,
                introducerRaw: formData.introducer_raw,
                department: formData.department,
                netAmount: calculations.net_amount
            });
            setCommissionPreview(res.data);
        } catch (err) {
            console.error('Commission preview failed:', err);
        } finally {
            setCommissionLoading(false);
        }
    };

    const calculateTotals = () => {
        const total = formData.selectedTests.reduce((sum, test) => sum + parseFloat(test.price), 0);
        const discount = parseFloat(formData.discount_amount) || 0;

        let totalTax = 0;
        formData.selectedTests.forEach(test => {
            const gstRate = parseFloat(test.gst_percentage) || 0;
            totalTax += (parseFloat(test.price) * gstRate) / 100;
        });

        const net = total - discount + totalTax;
        const paid = parseFloat(formData.paid_amount) || 0;
        const balance = net - paid;

        setCalculations({
            total_amount: total,
            discount_amount: discount,
            tax_amount: totalTax,
            cgst: totalTax / 2,
            sgst: totalTax / 2,
            net_amount: net,
            balance_amount: balance
        });
    };

    const handlePatientSearch = async (query) => {
        setPatientSearch(query);
        if (query.length < 3) {
            setPatientResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const response = await patientAPI.getAll({ search: query, limit: 5 });
            setPatientResults(response.data.patients || []);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setFormData({ ...formData, patient_id: patient.id });
        setPatientSearch('');
        setPatientResults([]);
    };

    const handleNewPatientSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await patientAPI.create(newPatient);
            const registeredPatient = response.data.patient;
            handleSelectPatient(registeredPatient);
            setShowPatientModal(false);
            setNewPatient({ name: '', age: '', gender: 'Male', phone: '', address: '' });
            alert('Patient registered and selected successfully!');
        } catch (err) {
            alert('Registration failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleTestToggle = (test) => {
        const isSelected = formData.selectedTests.find(t => t.id === test.id);
        if (isSelected) {
            setFormData({
                ...formData,
                selectedTests: formData.selectedTests.filter(t => t.id !== test.id)
            });
        } else {
            // Generate a temporary SID for the UI
            const tempSid = `SID${Date.now().toString().slice(-6)}`;
            setFormData({
                ...formData,
                selectedTests: [...formData.selectedTests, { ...test, sampleId: tempSid }]
            });
        }
    };

    const handleSampleIdChange = (testId, newSid) => {
        setFormData({
            ...formData,
            selectedTests: formData.selectedTests.map(t =>
                t.id === testId ? { ...t, sampleId: newSid } : t
            )
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.patient_id) {
            alert('Please select a patient');
            return;
        }
        if (!formData.doctor_id) {
            alert('Referring Doctor is mandatory. Please select a doctor.');
            return;
        }
        if (formData.selectedTests.length === 0) {
            alert('Please select at least one test');
            return;
        }

        try {
            const invoiceData = {
                patientId: parseInt(formData.patient_id),
                doctorId: parseInt(formData.doctor_id),
                introducerId: formData.introducer_id ? parseInt(formData.introducer_id) : null,
                introducerRaw: formData.introducer_raw,
                department: formData.department,
                tests: formData.selectedTests.map(t => ({
                    testId: t.id,
                    price: t.price,
                    gstPercentage: t.gst_percentage || 0,
                    sampleId: t.sampleId
                })),
                discountAmount: calculations.discount_amount,
                paymentMode: formData.payment_mode,
                paidAmount: parseFloat(formData.paid_amount) || 0
            };

            await invoiceAPI.create(invoiceData);
            alert('Invoice created successfully!');
            setShowForm(false);
            resetForm();
            loadData();
        } catch (err) {
            alert('Failed to create invoice: ' + (err.response?.data?.error || err.message));
        }
    };

    const resetForm = () => {
        setFormData({
            patient_id: '',
            doctor_id: '',
            introducer_id: '',
            introducer_raw: '',
            department: 'GENERAL',
            discount_amount: 0,
            payment_mode: 'CASH',
            paid_amount: 0,
            selectedTests: []
        });
        setSelectedPatient(null);
        setCommissionPreview(null);
    };

    const getPaymentStatusBadge = (status) => {
        const badges = {
            PAID: 'badge-success',
            PARTIAL: 'badge-warning',
            PENDING: 'badge-error'
        };
        return badges[status] || 'badge-info';
    };

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        invoiceId: null,
        paidAmount: 0,
        paymentMode: 'CASH',
        balanceAmount: 0
    });

    // Refund Modal State
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundData, setRefundData] = useState({
        invoiceId: null,
        refundAmount: 0,
        refundNote: '',
        maxRefundable: 0
    });

    const handleViewInvoice = async (invoiceId) => {
        try {
            setLoading(true);
            const response = await invoiceAPI.getById(invoiceId);
            const invoice = response.data.invoice;
            const items = response.data.items;

            setSelectedInvoice({ ...invoice, items });
            setShowViewModal(true);
        } catch (err) {
            console.error('Failed to fetch invoice details:', err);
            alert('Failed to load invoice details');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPaymentModal = (invoice) => {
        setPaymentData({
            invoiceId: invoice.id,
            paidAmount: invoice.balance_amount,
            paymentMode: 'CASH',
            balanceAmount: invoice.balance_amount
        });
        setShowPaymentModal(true);
    };

    const handleUpdatePayment = async (e) => {
        e.preventDefault();
        try {
            await invoiceAPI.updatePayment(paymentData.invoiceId, {
                paidAmount: paymentData.paidAmount,
                paymentMode: paymentData.paymentMode
            });
            alert('Payment updated successfully');
            setShowPaymentModal(false);
            loadData();
        } catch (err) {
            console.error('Failed to update payment:', err);
            alert('Failed to update payment');
        }
    };

    const handleOpenRefundModal = (invoice) => {
        const refundable = parseFloat(invoice.paid_amount) - parseFloat(invoice.refund_amount || 0);
        setRefundData({
            invoiceId: invoice.id,
            refundAmount: refundable > 0 ? refundable : 0,
            refundNote: '',
            maxRefundable: refundable
        });
        setShowRefundModal(true);
    };

    const handleProcessRefund = async (e) => {
        e.preventDefault();
        try {
            await invoiceAPI.processRefund(refundData.invoiceId, {
                refundAmount: refundData.refundAmount,
                refundNote: refundData.refundNote
            });
            alert('Refund processed successfully');
            setShowRefundModal(false);
            loadData();
        } catch (err) {
            console.error('Failed to process refund:', err);
            alert('Failed to process refund: ' + (err.response?.data?.error || err.message));
        }
    };

    const handlePrintInvoice = async (invoiceId) => {
        try {
            const response = await invoiceAPI.downloadPDF(invoiceId);

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extract filename from header or default
            let filename = `Invoice_${invoiceId}.pdf`;
            const disposition = response.headers['content-disposition'];
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error('Failed to download PDF:', err);
            const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || 'Unknown error';
            alert(`Failed to download invoice PDF. Error: ${errorMessage}\n\nPlease check if the backend server was restarted.`);
        }
    };

    return (
        <div className="billing-container">
            <div className="page-header">
                <h1 className="page-title">Billing & Invoicing</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? '✕ Cancel' : '➕ New Invoice'}
                </button>
            </div>

            {/* Invoice Creation Form */}
            {showForm && (
                <div className="card mb-3">
                    <h3 className="card-header">Create New Invoice</h3>
                    <form onSubmit={handleSubmit} className="billing-form">
                        <div className="form-row">
                            <div className="form-group patient-search-wrapper">
                                <label className="form-label">Patient Selection *</label>
                                {selectedPatient ? (
                                    <div className="selected-patient-box">
                                        <div className="patient-info-mini">
                                            <strong>{selectedPatient.name}</strong>
                                            <span>UHID: {selectedPatient.uhid} | Phone: {selectedPatient.phone}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-text btn-danger"
                                            onClick={() => setSelectedPatient(null)}
                                        >
                                            Change Patient
                                        </button>
                                    </div>
                                ) : (
                                    <div className="patient-search-input-container">
                                        <div className="input-group">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="🔍 Search by Name or Mobile No..."
                                                value={patientSearch}
                                                onChange={(e) => handlePatientSearch(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setShowPatientModal(true)}
                                            >
                                                + New Patient
                                            </button>
                                        </div>

                                        {patientResults.length > 0 && (
                                            <div className="patient-results-dropdown">
                                                {patientResults.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="patient-result-item"
                                                        onClick={() => handleSelectPatient(p)}
                                                    >
                                                        <div className="p-name">{p.name} ({p.gender}/{p.age})</div>
                                                        <div className="p-meta">Phone: {p.phone} | UHID: {p.uhid}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {patientSearch.length >= 3 && patientResults.length === 0 && !isSearching && (
                                            <div className="patient-no-results">
                                                No patient found. <a href="#" onClick={(e) => { e.preventDefault(); setShowPatientModal(true); }}>Register now?</a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Referring Doctor <span style={{ color: '#ef4444' }}>*</span></label>
                                <select
                                    className={`form-select ${!formData.doctor_id ? 'input-required' : ''}`}
                                    value={formData.doctor_id}
                                    onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Select Referring Doctor --</option>
                                    {doctors.filter(d => !d.is_introducer).map(doctor => (
                                        <option key={doctor.id} value={doctor.id}>
                                            {doctor.name}{doctor.specialization ? ` · ${doctor.specialization}` : ''}{doctor.commission_percentage ? ` (${doctor.commission_percentage}%)` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department / Modality</label>
                                <select
                                    className="form-select"
                                    value={formData.department}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        department: e.target.value,
                                        selectedTests: []   // clear tests on dept change
                                    })}
                                >
                                    <option value="GENERAL">General / Pathology</option>
                                    <option value="MRI">MRI</option>
                                    <option value="CT">CT Scan</option>
                                    <option value="USG">Ultrasound (USG)</option>
                                    <option value="XRAY">X-Ray</option>
                                    <option value="ECG">ECG</option>
                                    <option value="RADIOLOGY">Radiology (All)</option>
                                </select>
                            </div>
                        </div>

                        {/* Introducer Row */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Introducer
                                    <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6, fontWeight: 400 }}>registered introducers only</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={formData.introducer_id}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        introducer_id: e.target.value,
                                        introducer_raw: e.target.value ? '' : formData.introducer_raw
                                    })}
                                >
                                    <option value="">-- None / SELF --</option>
                                    {introducers.map(intro => (
                                        <option key={intro.id} value={intro.id}>
                                            {intro.name}{intro.specialization ? ` · ${intro.specialization}` : ''}{intro.commission_percentage ? ` (${intro.commission_percentage}%)` : ''}
                                        </option>
                                    ))}
                                </select>
                                <small style={{ color: '#6b7280', fontSize: '11px' }}>
                                    Leave blank if patient is self-referred or no introducer
                                </small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Introducer Type</label>
                                <select
                                    className="form-select"
                                    value={formData.introducer_id ? 'DOCTOR' : formData.introducer_raw}
                                    disabled={!!formData.introducer_id}
                                    onChange={(e) => setFormData({ ...formData, introducer_raw: e.target.value })}
                                >
                                    <option value="">None (Commission → Doctor)</option>
                                    <option value="SELF">SELF (Patient is self-referred)</option>
                                    <option value="DOCTOR">Registered Doctor ↑</option>
                                </select>
                                <small style={{ color: '#6b7280', fontSize: '11px' }}>
                                    {formData.introducer_id
                                        ? '🔒 Type auto-set — clear the Introducer to change'
                                        : 'Select SELF if patient referred themselves'}
                                </small>
                            </div>

                            {/* Live Commission Preview — always shown once doctor selected */}
                            {formData.doctor_id && (
                                <div className="form-group">
                                    <div className="commission-preview-box">
                                        {commissionLoading ? (
                                            <span style={{ color: '#9ca3af', fontSize: 12 }}>Calculating...</span>
                                        ) : !commissionPreview || calculations.net_amount <= 0 ? (
                                            <span style={{ color: '#9ca3af', fontSize: 12 }}>💡 Select tests to see commission preview</span>
                                        ) : (
                                            <>
                                                <div className={`comm-mode-badge ${commissionPreview.mode}`}>
                                                    {commissionPreview.mode === 'SPLIT' ? '⚖️ SPLIT'
                                                        : commissionPreview.mode === 'DOCTOR' ? '👨‍⚕️ DOCTOR'
                                                            : commissionPreview.mode === 'INTRODUCER' ? '🤝 INTRODUCER'
                                                                : 'NONE'}
                                                </div>
                                                <div className="comm-detail">
                                                    {commissionPreview.mode === 'SPLIT' ? (
                                                        <>
                                                            <span>👨‍⚕️ Dr: ₹{commissionPreview.doctorCommission} ({commissionPreview.commissionPct}%)</span>
                                                            <span>🤝 Intro: ₹{commissionPreview.introducerCommission}</span>
                                                        </>
                                                    ) : commissionPreview.mode === 'DOCTOR' ? (
                                                        <span>👨‍⚕️ Doctor: ₹{commissionPreview.doctorCommission} ({commissionPreview.commissionPct}%)</span>
                                                    ) : commissionPreview.mode === 'INTRODUCER' ? (
                                                        <span>🤝 Introducer: ₹{commissionPreview.introducerCommission}</span>
                                                    ) : null}
                                                </div>
                                                <div className="comm-summary" title={commissionPreview.summary}>ℹ️ {commissionPreview.summary}</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Test Selection */}
                        <div className="form-group">
                            <label className="form-label">
                                Select Tests *
                                <span style={{ fontSize: 11, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                                    Showing {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} for {formData.department}
                                </span>
                            </label>
                            {filteredTests.length === 0 ? (
                                <div style={{
                                    padding: '24px', textAlign: 'center', color: '#6b7280',
                                    border: '2px dashed #e5e7eb', borderRadius: 10, marginTop: 8
                                }}>
                                    No tests configured for <strong>{formData.department}</strong> department yet.
                                    <br /><small>Add tests in Test Master with the matching category.</small>
                                </div>
                            ) : (
                                <div className="test-grid">
                                    {filteredTests.map(test => (
                                        <div
                                            key={test.id}
                                            className={`test-card ${formData.selectedTests.find(t => t.id === test.id) ? 'selected' : ''}`}
                                            onClick={() => handleTestToggle(test)}
                                        >
                                            <div className="test-info">
                                                <h4>{test.name}</h4>
                                                <p className="test-code">{test.code}</p>
                                            </div>
                                            <div className="test-price">₹{test.price}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Tests Summary */}
                        {formData.selectedTests.length > 0 && (
                            <div className="selected-tests">
                                <h4>Selected Tests & Samples ({formData.selectedTests.length})</h4>
                                <div className="selected-tests-grid">
                                    {formData.selectedTests.map(test => (
                                        <div key={test.id} className="selected-test-row">
                                            <div className="test-name-info">
                                                <strong>{test.name}</strong>
                                                <span>₹{test.price}</span>
                                            </div>
                                            <div className="sample-id-input">
                                                <label>Sample ID / Barcode:</label>
                                                <input
                                                    type="text"
                                                    value={test.sampleId}
                                                    onChange={(e) => handleSampleIdChange(test.id, e.target.value)}
                                                    placeholder="Barcode"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment Details */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Discount Amount</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.discount_amount}
                                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Mode</label>
                                <select
                                    className="form-select"
                                    value={formData.payment_mode}
                                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="UPI">UPI (Quick Scan)</option>
                                    <option value="GPAY">Google Pay</option>
                                    <option value="PHONEPE">PhonePe</option>
                                    <option value="PAYTM">Paytm</option>
                                    <option value="CARD">Credit/Debit Card</option>
                                    <option value="ONLINE">Online Transfer</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Amount Paid</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formData.paid_amount}
                                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        {/* Calculation Summary */}
                        <div className="calculation-summary">
                            <div className="calc-row">
                                <span>Total Amount:</span>
                                <span className="amount">₹{calculations.total_amount.toFixed(2)}</span>
                            </div>
                            <div className="calc-row">
                                <span>Discount:</span>
                                <span className="amount discount">-₹{calculations.discount_amount.toFixed(2)}</span>
                            </div>
                            <div className="calc-row">
                                <span>Tax (GST):</span>
                                <span className="amount">₹{calculations.tax_amount.toFixed(2)}</span>
                            </div>
                            {calculations.tax_amount > 0 && (
                                <>
                                    <div className="calc-row sub-tax">
                                        <span>CGST ({(calculations.tax_amount / calculations.total_amount * 50).toFixed(1)}%):</span>
                                        <span className="amount">₹{calculations.cgst.toFixed(2)}</span>
                                    </div>
                                    <div className="calc-row sub-tax">
                                        <span>SGST ({(calculations.tax_amount / calculations.total_amount * 50).toFixed(1)}%):</span>
                                        <span className="amount">₹{calculations.sgst.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            <div className="calc-row total">
                                <span>Net Amount:</span>
                                <span className="amount">₹{calculations.net_amount.toFixed(2)}</span>
                            </div>
                            <div className="calc-row">
                                <span>Paid Amount:</span>
                                <span className="amount">₹{formData.paid_amount || 0}</span>
                            </div>
                            <div className="calc-row balance">
                                <span>Balance Due:</span>
                                <span className="amount">₹{calculations.balance_amount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">
                                Create Invoice
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowForm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Recent Invoices */}
            <div className="card">
                <h3 className="card-header">Recent Invoices</h3>
                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="empty-state">
                        <p>No invoices found</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Paid</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td>
                                            <span className="badge badge-info">{invoice.invoice_number}</span>
                                        </td>
                                        <td className="font-semibold">{invoice.patient_name}</td>
                                        <td>{new Date(invoice.created_at).toLocaleDateString()}</td>
                                        <td>₹{parseFloat(invoice.net_amount).toFixed(2)}</td>
                                        <td>₹{parseFloat(invoice.paid_amount).toFixed(2)}</td>
                                        <td>₹{parseFloat(invoice.balance_amount).toFixed(2)}</td>
                                        <td>
                                            <span className={`badge ${getPaymentStatusBadge(invoice.payment_status)}`}>
                                                {invoice.payment_status}
                                            </span>
                                            {parseFloat(invoice.refund_amount) > 0 && (
                                                <div style={{ fontSize: '10px', color: '#e74c3c', marginTop: '4px' }}>
                                                    Refunded: ₹{parseFloat(invoice.refund_amount).toFixed(2)}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn-icon"
                                                title="View Invoice"
                                                onClick={() => handleViewInvoice(invoice.id)}
                                            >
                                                👁️
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title="Print"
                                                onClick={() => handlePrintInvoice(invoice.id)}
                                            >
                                                🖨️
                                            </button>
                                            {parseFloat(invoice.balance_amount) > 0 && (
                                                <button
                                                    className="btn-icon text-success"
                                                    title="Collect Payment"
                                                    onClick={() => handleOpenPaymentModal(invoice)}
                                                >
                                                    💰
                                                </button>
                                            )}
                                            {(parseFloat(invoice.paid_amount) - parseFloat(invoice.refund_amount || 0)) > 0 && invoice.payment_status !== 'REFUNDED' && (
                                                <button
                                                    className="btn-icon text-danger"
                                                    title="Process Refund"
                                                    onClick={() => handleOpenRefundModal(invoice)}
                                                >
                                                    ↩️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Invoice Modal */}
            {showViewModal && selectedInvoice && (
                <div className="modal-overlay">
                    <div className="modal-content invoice-modal">
                        <div className="modal-header">
                            <h3>Invoice Details</h3>
                            <button className="close-btn" onClick={() => setShowViewModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="invoice-header-info">
                                <div>
                                    <p><strong>Invoice #:</strong> {selectedInvoice.invoice_number}</p>
                                    <p><strong>Date:</strong> {new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                                    <p>
                                        <strong>Status:</strong>
                                        <span className={`badge ${getPaymentStatusBadge(selectedInvoice.payment_status)}`}>{selectedInvoice.payment_status}</span>
                                    </p>
                                    <p><strong>Payment Mode:</strong> {selectedInvoice.payment_mode}</p>
                                </div>
                                <div>
                                    <p><strong>Patient:</strong> {selectedInvoice.patient_name}</p>
                                    <p><strong>UHID:</strong> {selectedInvoice.uhid}</p>
                                    <p><strong>Doctor:</strong> {selectedInvoice.doctor_name || 'Self'}</p>
                                </div>
                            </div>

                            <table className="table mt-3">
                                <thead>
                                    <tr>
                                        <th>Test</th>
                                        <th>Code</th>
                                        <th>Sample ID</th>
                                        <th>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedInvoice.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.test_name}</td>
                                            <td>{item.test_code}</td>
                                            <td><span className="badge badge-outline">{item.sample_id || '-'}</span></td>
                                            <td>₹{parseFloat(item.price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="invoice-totals mt-3">
                                <div className="total-row">
                                    <span>Subtotal:</span>
                                    <span>₹{parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>Discount:</span>
                                    <span>-₹{parseFloat(selectedInvoice.discount_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>Tax:</span>
                                    <span>₹{parseFloat(selectedInvoice.tax_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row final">
                                    <span>Net Amount:</span>
                                    <span>₹{parseFloat(selectedInvoice.net_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row">
                                    <span>Paid:</span>
                                    <span>₹{parseFloat(selectedInvoice.paid_amount).toFixed(2)}</span>
                                </div>
                                <div className="total-row balance">
                                    <span>Balance:</span>
                                    <span>₹{parseFloat(selectedInvoice.balance_amount).toFixed(2)}</span>
                                </div>
                                {parseFloat(selectedInvoice.refund_amount) > 0 && (
                                    <div className="total-row" style={{ color: '#e74c3c' }}>
                                        <span>Refunded:</span>
                                        <span>-₹{parseFloat(selectedInvoice.refund_amount).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary"
                                onClick={() => handlePrintInvoice(selectedInvoice.id)}
                            >
                                🖨️ Print Invoice
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowViewModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Payment Update Modal */}
            {showPaymentModal && (
                <div className="modal-overlay">
                    <div className="modal-content small-modal">
                        <div className="modal-header">
                            <h3>Collect Payment</h3>
                            <button className="close-btn" onClick={() => setShowPaymentModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleUpdatePayment}>
                            <div className="modal-body">
                                <div className="payment-info mb-3">
                                    <p><strong>Balance Due:</strong> ₹{parseFloat(paymentData.balanceAmount).toFixed(2)}</p>
                                </div>
                                <div className="form-group mb-3">
                                    <label className="form-label">Payment Amount</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={paymentData.paidAmount}
                                        onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                                        max={paymentData.balanceAmount}
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select
                                        className="form-select"
                                        value={paymentData.paymentMode}
                                        onChange={(e) => setPaymentData({ ...paymentData, paymentMode: e.target.value })}
                                    >
                                        <option value="CASH">Cash</option>
                                        <option value="UPI">UPI (Quick Scan)</option>
                                        <option value="GPAY">Google Pay</option>
                                        <option value="PHONEPE">PhonePe</option>
                                        <option value="PAYTM">Paytm</option>
                                        <option value="CARD">Credit/Debit Card</option>
                                        <option value="ONLINE">Online Transfer</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-primary">
                                    Record Payment
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowPaymentModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <div className="modal-overlay">
                    <div className="modal-content small-modal">
                        <div className="modal-header">
                            <h3>Process Refund</h3>
                            <button className="close-btn" onClick={() => setShowRefundModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleProcessRefund}>
                            <div className="modal-body">
                                <div className="payment-info mb-3">
                                    <p style={{ color: '#e74c3c' }}>
                                        <strong>Max Refundable:</strong> ₹{parseFloat(refundData.maxRefundable).toFixed(2)}
                                    </p>
                                </div>
                                <div className="form-group mb-3">
                                    <label className="form-label">Refund Amount</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={refundData.refundAmount}
                                        onChange={(e) => setRefundData({ ...refundData, refundAmount: e.target.value })}
                                        max={refundData.maxRefundable}
                                        min="0.01"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="form-group mb-3">
                                    <label className="form-label">Refund Reason / Note</label>
                                    <textarea
                                        className="form-input"
                                        rows="3"
                                        value={refundData.refundNote}
                                        onChange={(e) => setRefundData({ ...refundData, refundNote: e.target.value })}
                                        placeholder="E.g. Test cancelled by patient"
                                        required
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-danger">
                                    Confirm Refund
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowRefundModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* New Patient Modal */}
            {showPatientModal && (
                <div className="modal-overlay">
                    <div className="modal-content medium">
                        <div className="modal-header">
                            <h3>Register New Patient</h3>
                            <button className="close-btn" onClick={() => setShowPatientModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleNewPatientSubmit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Full Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            required
                                            value={newPatient.name}
                                            onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Age *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            required
                                            value={newPatient.age}
                                            onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Gender *</label>
                                        <select
                                            className="form-select"
                                            required
                                            value={newPatient.gender}
                                            onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Phone/Mobile *</label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            required
                                            value={newPatient.phone}
                                            onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                                            pattern="[0-9]{10}"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <textarea
                                        className="form-input"
                                        rows="2"
                                        value={newPatient.address}
                                        onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="btn btn-primary">Register & Select</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowPatientModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Billing;
