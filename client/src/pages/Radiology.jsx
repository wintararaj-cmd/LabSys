import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './Radiology.css';

const Radiology = () => {
    const toast = useToast();
    const confirm = useConfirm();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [findings, setFindings] = useState('');
    const [impression, setImpression] = useState('');
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReports();
        fetchTemplates();
    }, []);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setShowEditModal(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/radiology');
            setReports(response.data);
        } catch (err) {
            setError('Failed to fetch radiology reports');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/radiology/templates');
            setTemplates(response.data);
        } catch (err) {
            console.error('Failed to fetch templates');
        }
    };

    const handleEditReport = async (report) => {
        try {
            const response = await api.get(`/radiology/${report.id}`);
            const data = response.data.report;
            setSelectedReport(data);
            setFindings(data.findings || '');
            setImpression(data.impression || '');
            setShowEditModal(true);
        } catch (err) {
            setError('Failed to load report details');
        }
    };

    const handleSaveReport = async (isFinal = false) => {
        if (!selectedReport) return;

        try {
            setIsSaving(true);
            await api.put(`/radiology/${selectedReport.id}`, {
                findings,
                impression,
                isFinal,
                templateId: selectedTemplate
            });
            toast.success(isFinal ? 'Report finalized and locked!' : 'Report saved as draft.');
            setShowEditModal(false);
            fetchReports();
        } catch (err) {
            setError('Failed to save report');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadTemplate = async (templateId) => {
        const template = templates.find(t => t.id === parseInt(templateId));
        if (template) {
            if (findings || impression) {
                const ok = await confirm({
                    title: 'Load Template',
                    message: 'This will overwrite your current findings and impression with the template defaults. Continue?',
                    confirmText: 'Load Template',
                    variant: 'warning'
                });
                if (!ok) return;
            }
            setFindings(template.default_findings || '');
            setImpression(template.default_impression || '');
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
            link.setAttribute('download', `radiology_report_${reportId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Failed to download PDF');
        }
    };

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ],
    };

    if (loading) return <div className="radiology-container"><div className="loading">Loading...</div></div>;

    return (
        <div className="radiology-container">
            <div className="radiology-header">
                <div>
                    <h1>⚡ Radiology Reports</h1>
                    <p>Narrative-based report generation for X-Ray, USG, CT, and MRI</p>
                </div>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="reports-grid">
                {reports.length === 0 ? (
                    <div className="no-data">No radiology reports found.</div>
                ) : (
                    reports.map(report => (
                        <div key={report.id} className={`report-card ${report.is_locked ? 'locked' : ''}`}>
                            <div className="card-status">
                                <span className={`status-tag ${report.status.toLowerCase()}`}>
                                    {report.status}
                                </span>
                                {report.is_locked && <span className="lock-icon">🔒 Locked</span>}
                            </div>
                            <div className="card-body">
                                <h3>{report.patient_name}</h3>
                                <p className="test-name">{report.test_name}</p>
                                <div className="meta-info">
                                    <span>UHID: {report.uhid}</span>
                                    <span>Inv: {report.invoice_number}</span>
                                    <span>Date: {new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="card-footer">
                                <button
                                    onClick={() => handleEditReport(report)}
                                    className="btn-edit"
                                    disabled={report.is_locked}
                                >
                                    {report.is_locked ? 'View Report' : 'Edit Report'}
                                </button>
                                {(report.status === 'VERIFIED' || report.status === 'COMPLETED') && (
                                    <button
                                        onClick={() => handleDownloadPDF(report.id)}
                                        className="btn-pdf"
                                    >
                                        📄 PDF
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showEditModal && selectedReport && (
                <div className="modal-overlay">
                    <div className="modal-content radiology-modal">
                        <div className="modal-header">
                            <h2>Radiology Report: {selectedReport.patient_name}</h2>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="report-summary">
                                <div><strong>Test:</strong> {selectedReport.test_name}</div>
                                <div><strong>UHID:</strong> {selectedReport.uhid}</div>
                                <div><strong>Doctor:</strong> {selectedReport.doctor_name || 'Self'}</div>
                            </div>

                            <div className="template-selector">
                                <label>Select Template:</label>
                                <select value={selectedTemplate} onChange={(e) => {
                                    setSelectedTemplate(e.target.value);
                                    handleLoadTemplate(e.target.value);
                                }}>
                                    <option value="">-- Choose Template --</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>

                            </div>

                            <div className="editor-section">
                                <label>FINDINGS</label>
                                <ReactQuill
                                    theme="snow"
                                    value={findings}
                                    onChange={setFindings}
                                    modules={modules}
                                    placeholder="Enter detailed findings here..."
                                />
                            </div>

                            <div className="editor-section">
                                <label>IMPRESSION</label>
                                <ReactQuill
                                    theme="snow"
                                    value={impression}
                                    onChange={setImpression}
                                    modules={modules}
                                    placeholder="Enter summary impression here..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                onClick={() => handleSaveReport(false)}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Draft'}
                            </button>
                            <button
                                className="btn-final"
                                onClick={() => handleSaveReport(true)}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Finalizing...' : 'Finalize & Lock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Radiology;
