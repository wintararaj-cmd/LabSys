import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import './SampleTracking.css';

const SampleTracking = () => {
    const [sampleId, setSampleId] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [externalLabs, setExternalLabs] = useState([]);
    const [updateMsg, setUpdateMsg] = useState('');

    const [formData, setFormData] = useState({
        external_lab_id: '',
        outbound_status: 'NOT_SENT',
        tracking_number: '',
        courier_name: '',
        external_cost: ''
    });

    const inputRef = useRef(null);

    useEffect(() => {
        fetchExternalLabs();
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const fetchExternalLabs = async () => {
        try {
            const response = await api.get('/external-labs');
            setExternalLabs(response.data);
        } catch (err) {
            console.error('Failed to fetch labs', err);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!sampleId) return;

        setLoading(true);
        setError('');
        setReport(null);
        setUpdateMsg('');

        try {
            const response = await api.get(`/reports/sample/${sampleId}`);
            const data = response.data;
            setReport(data);
            setFormData({
                external_lab_id: data.external_lab_id || '',
                outbound_status: data.outbound_status || 'NOT_SENT',
                tracking_number: data.tracking_number || '',
                courier_name: data.courier_name || '',
                external_cost: data.external_cost || ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Sample not found');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/reports/${report.id}/outbound-status`, formData);
            setUpdateMsg('Status updated successfully!');
            // Refresh local report data
            setReport({ ...report, ...formData });
            setTimeout(() => setUpdateMsg(''), 3000);
        } catch (err) {
            setError('Failed to update status');
        }
    };

    return (
        <div className="sample-tracking-container">
            <div className="tracking-header">
                <h1>🔍 Sample Tracking & Updates</h1>
                <p>Scan barcode or enter Sample ID to track and update status</p>
            </div>

            <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Enter Sample ID (e.g. SID12345)"
                        value={sampleId}
                        onChange={(e) => setSampleId(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="btn-search" disabled={loading}>
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {error && <div className="error-msg">{error}</div>}
            {updateMsg && <div className="success-msg">{updateMsg}</div>}

            {report && (
                <div className="tracking-results anim-fade-in">
                    <div className="sample-card">
                        <div className="card-header">
                            <span className="sid-pill">{report.sample_id}</span>
                            <span className={`status-pill ${report.status.toLowerCase()}`}>{report.status}</span>
                        </div>

                        <div className="card-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Patient</label>
                                    <p>{report.patient_name}</p>
                                </div>
                                <div className="info-item">
                                    <label>UHID</label>
                                    <p>{report.patient_uhid}</p>
                                </div>
                                <div className="info-item">
                                    <label>Test</label>
                                    <p>{report.test_name}</p>
                                </div>
                                <div className="info-item">
                                    <label>Date</label>
                                    <p>{new Date(report.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <hr />

                            <form onSubmit={handleUpdate} className="update-form">
                                <h3>Update Outbound Status</h3>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Reference Lab</label>
                                        <select
                                            value={formData.external_lab_id}
                                            onChange={(e) => setFormData({ ...formData, external_lab_id: e.target.value })}
                                        >
                                            <option value="">Internal (In-house)</option>
                                            {externalLabs.map(lab => (
                                                <option key={lab.id} value={lab.id}>{lab.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Tracking Status</label>
                                        <select
                                            value={formData.outbound_status}
                                            onChange={(e) => setFormData({ ...formData, outbound_status: e.target.value })}
                                        >
                                            <option value="NOT_SENT">Not Sent</option>
                                            <option value="SENT">Sent to Lab</option>
                                            <option value="RECEIVED">Received by Lab</option>
                                            <option value="REPORT_UPLOADED">Report Uploaded</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Tracking Number</label>
                                        <input
                                            type="text"
                                            value={formData.tracking_number}
                                            onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                                            placeholder="Enter tracking #"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Courier Service</label>
                                        <input
                                            type="text"
                                            value={formData.courier_name}
                                            onChange={(e) => setFormData({ ...formData, courier_name: e.target.value })}
                                            placeholder="e.g. FedEx, BlueDart"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>External Cost</label>
                                        <input
                                            type="number"
                                            value={formData.external_cost}
                                            onChange={(e) => setFormData({ ...formData, external_cost: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn-update">Save Update</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SampleTracking;
