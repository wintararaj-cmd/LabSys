import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Reports.css';
import BarcodeLabel from '../components/BarcodeLabel';
import ReactDOM from 'react-dom';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);
    const [showResultForm, setShowResultForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [testResults, setTestResults] = useState({});
    const [verificationNote, setVerificationNote] = useState('');

    // Outbound Sample State
    const [showOutboundModal, setShowOutboundModal] = useState(false);
    const [externalLabs, setExternalLabs] = useState([]);
    const [outboundData, setOutboundData] = useState({
        external_lab_id: '',
        outbound_status: 'NOT_SENT',
        tracking_number: '',
        courier_name: '',
        external_cost: ''
    });
    const [selectedReportIds, setSelectedReportIds] = useState([]);

    const reportsPerPage = 10;

    useEffect(() => {
        fetchReports();
    }, [statusFilter]);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reports');
            setReports(response.data.reports || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch reports');
            setReports([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = async (reportId) => {
        try {
            const response = await api.get(`/reports/${reportId}`);
            const reportData = response.data.report || response.data;
            setSelectedReport(reportData);

            // Initialize test results from existing data
            const resultsMap = {};
            reportData.tests?.forEach(test => {
                resultsMap[test.test_id] = {
                    result_value: test.result_value || '',
                    remarks: test.remarks || ''
                };
            });
            setTestResults(resultsMap);
            setShowResultForm(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch report details');
        }
    };

    // ... (handleResultChange, checkAbnormalValue remain unchanged)

    const handleResultChange = (testId, field, value) => {
        setTestResults(prev => ({
            ...prev,
            [testId]: {
                ...prev[testId],
                [field]: value
            }
        }));
    };

    const checkAbnormalValue = (test, value) => {
        if (!value || !test.normal_range_male) return false;

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;

        // Simple range check (format: "min-max unit")
        const rangeMatch = test.normal_range_male.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
        if (rangeMatch) {
            const min = parseFloat(rangeMatch[1]);
            const max = parseFloat(rangeMatch[2]);
            return numValue < min || numValue > max;
        }
        return false;
    };

    const handleSaveResults = async () => {
        if (!selectedReport) return;

        try {
            const results = Object.entries(testResults).map(([testId, data]) => ({
                test_id: parseInt(testId),
                result_value: data.result_value,
                remarks: data.remarks
            }));

            await api.put(
                `/reports/${selectedReport.id}/results`,
                { results }
            );

            alert('Results saved successfully!');
            fetchReports();
            setShowResultForm(false);
            setSelectedReport(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save results');
        }
    };

    const handleVerifyReport = async () => {
        if (!selectedReport) return;

        if (!window.confirm('Are you sure you want to verify this report? This action cannot be undone.')) {
            return;
        }

        try {
            await api.put(
                `/reports/${selectedReport.id}/verify`,
                { verification_note: verificationNote }
            );

            alert('Report verified successfully!');
            fetchReports();
            setShowResultForm(false);
            setSelectedReport(null);
            setVerificationNote('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to verify report');
        }
    };

    const handleDownloadPDF = async (reportId) => {
        try {
            const response = await api.get(`/reports/${reportId}/pdf`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${reportId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to download PDF');
        }
    };

    // --- Outbound Sample Handlers ---

    const fetchExternalLabs = async () => {
        try {
            const response = await api.get('/external-labs');
            setExternalLabs(response.data);
        } catch (err) {
            console.error('Failed to fetch external labs', err);
        }
    };

    const handleOpenOutboundModal = (report) => {
        setSelectedReport(report);
        setSelectedReportIds(report.report_ids || []);
        setOutboundData({
            external_lab_id: report.external_lab_id || '',
            outbound_status: report.outbound_status || 'NOT_SENT',
            tracking_number: report.tracking_number || '',
            courier_name: report.courier_name || '',
            external_cost: report.external_cost || ''
        });
        fetchExternalLabs();
        setShowOutboundModal(true);
    };

    const handleSaveOutbound = async () => {
        if (selectedReportIds.length === 0) {
            alert('Please select at least one sample');
            return;
        }

        try {
            await api.put(`/reports/${selectedReport.id}/outbound-status`, {
                ...outboundData,
                reportIds: selectedReportIds
            });
            setShowOutboundModal(false);
            fetchReports();
            alert('Outbound status updated!');
        } catch (err) {
            console.error('Failed to update outbound status', err);
            alert('Failed to update status');
        }
    };

    const handlePrintBarcode = (report) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write('<html><head><title>Print Barcode</title>');
        printWindow.document.write('<style>@media print { .barcode-wrapper { page-break-after: always; } }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div id="barcode-container"></div>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();

        const container = printWindow.document.getElementById('barcode-container');

        // Render 1 label per test/sample if plural, otherwise just one
        const sampleIds = report.sample_ids || [report.sample_id]; // Use the aggregated array
        const testNames = report.test_names || [(report.test_count + ' Tests')];

        ReactDOM.render(
            <>
                {sampleIds.map((sid, index) => (
                    <div key={index} className="barcode-wrapper">
                        <BarcodeLabel
                            sampleId={sid || '-'}
                            patientName={report.patient_name}
                            testName={testNames[index] || 'Lab Test'}
                            uhid={report.patient_uhid}
                            date={new Date(report.created_at).toLocaleDateString()}
                        />
                    </div>
                ))}
            </>,
            container
        );

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 800);
    };

    // Filter reports
    const filteredReports = reports.filter(report => {
        const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
        const matchesSearch =
            report.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.patient_uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Pagination
    const indexOfLastReport = currentPage * reportsPerPage;
    const indexOfFirstReport = indexOfLastReport - reportsPerPage;
    const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
    const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: { class: 'status-pending', text: 'Pending' },
            COMPLETED: { class: 'status-completed', text: 'Completed' },
            VERIFIED: { class: 'status-verified', text: 'Verified' }
        };
        const badge = badges[status] || badges.PENDING;
        return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
    };

    const getOutboundBadge = (status) => {
        const badges = {
            'NOT_SENT': { class: 'outbound-not-sent', text: 'Internal' },
            'SENT': { class: 'outbound-sent', text: 'Sent' },
            'RECEIVED': { class: 'outbound-received', text: 'Lab Received' },
            'REPORT_UPLOADED': { class: 'outbound-uploaded', text: 'Uploaded' }
        };
        const badge = badges[status] || badges['NOT_SENT'];
        return <span className={`outbound-badge ${badge.class}`}>{badge.text}</span>;
    };

    if (loading) {
        return <div className="reports-container"><div className="loading">Loading reports...</div></div>;
    }

    return (
        <div className="reports-container">
            <div className="reports-header">
                <h1>📋 Reports Management</h1>
                <p>Manage test results and report verification</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Filters */}
            <div className="reports-filters">
                <div className="filter-group">
                    <label>Status Filter:</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="filter-select"
                    >
                        <option value="ALL">All Reports</option>
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="VERIFIED">Verified</option>
                    </select>
                </div>

                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search by patient name, UHID, or invoice..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Reports Table */}
            <div className="reports-table-container">
                <table className="reports-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Patient</th>
                            <th>UHID</th>
                            <th>Tests</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Outbound</th>
                            <th>Sample ID</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentReports.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-data">
                                    No reports found
                                </td>
                            </tr>
                        ) : (
                            currentReports.map(report => (
                                <tr key={report.id}>
                                    <td className="invoice-number">{report.invoice_number}</td>
                                    <td>{report.patient_name}</td>
                                    <td className="uhid">{report.patient_uhid}</td>
                                    <td>{report.test_count || 0} test(s)</td>
                                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                                    <td>{getStatusBadge(report.status)}</td>
                                    <td>
                                        <div className="outbound-status-stack">
                                            {report.outbound_statuses && report.outbound_statuses.map((status, idx) => (
                                                <div key={idx} title={`${report.test_names[idx]}: ${status}`}>
                                                    {getOutboundBadge(status)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="sample-id-stack">
                                            {report.sample_ids && report.sample_ids.length > 0 ? (
                                                report.sample_ids.map((sid, idx) => (
                                                    <div key={idx} title={`${report.test_names[idx] || 'Test'}: ${sid}`}>
                                                        <span className="sample-id-badge">{sid}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="sample-id-badge">{report.sample_id || '-'}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="actions">
                                        <button
                                            onClick={() => handleViewReport(report.id)}
                                            className="btn-view"
                                        >
                                            {report.status === 'PENDING' ? 'Enter Results' : 'View'}
                                        </button>
                                        <button
                                            onClick={() => handleOpenOutboundModal(report)}
                                            className="btn-outbound"
                                            title="Send to External Lab"
                                        >
                                            📤 Send
                                        </button>
                                        <button
                                            onClick={() => handlePrintBarcode(report)}
                                            className="btn-barcode"
                                            title="Print Barcode"
                                        >
                                            🖨️ Barcode
                                        </button>
                                        {(report.status === 'VERIFIED' || report.status === 'COMPLETED') && (
                                            <button
                                                onClick={() => handleDownloadPDF(report.id)}
                                                className="btn-download"
                                            >
                                                📄 PDF
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Outbound Modal */}
            {showOutboundModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Outbound Sample Management</h2>
                        <div className="form-group">
                            <label>Select Samples/Tests:</label>
                            <div className="checkbox-list">
                                {selectedReport?.report_ids?.map((id, index) => (
                                    <div key={id} className="checkbox-item">
                                        <input
                                            type="checkbox"
                                            id={`report-${id}`}
                                            checked={selectedReportIds.includes(id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedReportIds([...selectedReportIds, id]);
                                                } else {
                                                    setSelectedReportIds(selectedReportIds.filter(rid => rid !== id));
                                                }
                                            }}
                                        />
                                        <label htmlFor={`report-${id}`}>
                                            <strong>{selectedReport.sample_ids[index]}</strong> - {selectedReport.test_names[index]}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>External Lab:</label>
                            <select
                                value={outboundData.external_lab_id}
                                onChange={(e) => setOutboundData({ ...outboundData, external_lab_id: e.target.value })}
                            >
                                <option value="">Select Lab</option>
                                {externalLabs.map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Status:</label>
                            <select
                                value={outboundData.outbound_status}
                                onChange={(e) => setOutboundData({ ...outboundData, outbound_status: e.target.value })}
                            >
                                <option value="NOT_SENT">Not Sent</option>
                                <option value="SENT">Sent to Lab</option>
                                <option value="RECEIVED">Received by Lab</option>
                                <option value="REPORT_UPLOADED">Report Uploaded</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Tracking Number:</label>
                            <input
                                type="text"
                                value={outboundData.tracking_number}
                                onChange={(e) => setOutboundData({ ...outboundData, tracking_number: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Courier Name:</label>
                            <input
                                type="text"
                                value={outboundData.courier_name}
                                onChange={(e) => setOutboundData({ ...outboundData, courier_name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>External Cost:</label>
                            <input
                                type="number"
                                value={outboundData.external_cost}
                                onChange={(e) => setOutboundData({ ...outboundData, external_cost: e.target.value })}
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowOutboundModal(false)} className="btn-cancel">Cancel</button>
                            <button onClick={handleSaveOutbound} className="btn-save">Save Update</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Result Entry Modal (existing) */}
            {showResultForm && selectedReport && (
                <div className="modal-overlay" onClick={() => setShowResultForm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Test Results - {selectedReport.patient_name}</h2>
                            <button className="close-btn" onClick={() => setShowResultForm(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="report-info">
                                <div className="info-item">
                                    <strong>UHID:</strong> {selectedReport.patient_uhid}
                                </div>
                                <div className="info-item">
                                    <strong>Invoice:</strong> {selectedReport.invoice_number}
                                </div>
                                <div className="info-item">
                                    <strong>Date:</strong> {new Date(selectedReport.created_at).toLocaleDateString()}
                                </div>
                                <div className="info-item">
                                    <strong>Status:</strong> {getStatusBadge(selectedReport.status)}
                                </div>
                                <div className="info-item">
                                    <strong>Sample ID:</strong>
                                    <div className="sample-id-list-inline">
                                        {selectedReport.sample_ids && selectedReport.sample_ids.length > 0 ? (
                                            selectedReport.sample_ids.map((sid, idx) => (
                                                <span key={idx} className="sample-id-text">{sid}{idx < selectedReport.sample_ids.length - 1 ? ', ' : ''}</span>
                                            ))
                                        ) : (
                                            <span className="sample-id-text">{selectedReport.sample_id || '-'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="tests-results">
                                <h3>Test Results</h3>
                                {selectedReport.tests?.map(test => {
                                    const isAbnormal = checkAbnormalValue(
                                        test,
                                        testResults[test.test_id]?.result_value
                                    );

                                    return (
                                        <div key={test.test_id} className={`test-result-item ${isAbnormal ? 'abnormal' : ''}`}>
                                            <div className="test-header">
                                                <div className="test-title-group">
                                                    <h4>{test.test_name}</h4>
                                                    <span className="test-code">{test.test_code}</span>
                                                </div>
                                                <span className="sample-id-badge">{test.sample_id || '-'}</span>
                                            </div>

                                            <div className="test-details">
                                                <div className="detail-row">
                                                    <span className="label">Normal Range:</span>
                                                    <span className="value">{test.normal_range_male || 'N/A'}</span>
                                                </div>
                                                <div className="detail-row">
                                                    <span className="label">Unit:</span>
                                                    <span className="value">{test.unit || 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div className="result-inputs">
                                                <div className="input-group">
                                                    <label>Result Value:</label>
                                                    <input
                                                        type="text"
                                                        value={testResults[test.test_id]?.result_value || ''}
                                                        onChange={(e) => handleResultChange(test.test_id, 'result_value', e.target.value)}
                                                        placeholder="Enter result value"
                                                        disabled={selectedReport.status === 'VERIFIED'}
                                                    />
                                                    {isAbnormal && (
                                                        <span className="abnormal-indicator">⚠️ Abnormal</span>
                                                    )}
                                                </div>

                                                <div className="input-group">
                                                    <label>Remarks:</label>
                                                    <textarea
                                                        value={testResults[test.test_id]?.remarks || ''}
                                                        onChange={(e) => handleResultChange(test.test_id, 'remarks', e.target.value)}
                                                        placeholder="Optional remarks"
                                                        rows="2"
                                                        disabled={selectedReport.status === 'VERIFIED'}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedReport.status !== 'VERIFIED' && (
                                <div className="verification-section">
                                    <h3>Verification</h3>
                                    <div className="input-group">
                                        <label>Verification Note (Optional):</label>
                                        <textarea
                                            value={verificationNote}
                                            onChange={(e) => setVerificationNote(e.target.value)}
                                            placeholder="Add verification notes..."
                                            rows="3"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {selectedReport.status !== 'VERIFIED' && (
                                <>
                                    <button onClick={handleSaveResults} className="btn-save">
                                        💾 Save Results
                                    </button>
                                    <button onClick={handleVerifyReport} className="btn-verify">
                                        ✅ Verify Report
                                    </button>
                                </>
                            )}
                            {(selectedReport.status === 'VERIFIED' || selectedReport.status === 'COMPLETED') && (
                                <button onClick={() => handleDownloadPDF(selectedReport.id)} className="btn-download-large">
                                    📄 Download PDF
                                </button>
                            )}
                            <button onClick={() => setShowResultForm(false)} className="btn-cancel">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
