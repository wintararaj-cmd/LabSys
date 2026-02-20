import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Portal.css'; // Optional: Use a specific or inline CSS to keep it neat

function Portal() {
    const { id } = useParams(); // invoiceId from /verify/:id
    const navigate = useNavigate();

    const [invoiceId, setInvoiceId] = useState(id || '');
    const [uhid, setUhid] = useState('');

    // State for viewing
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        if (id) {
            handleVerify(id);
        }
    }, [id]);

    const handleVerify = async (invId) => {
        setLoading(true);
        setError('');
        setReportData(null);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/public/verify/${invId}`);
            setReportData(res.data);
            setInvoiceId(invId);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to find report. Check Invoice ID.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!invoiceId) return;
        navigate(`/verify/${invoiceId}`);
        handleVerify(invoiceId);
    };

    const handleDownload = async (e) => {
        e.preventDefault();
        setAuthError('');
        setDownloading(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/public/download/${invoiceId}`, { uhid });
            const pdfUrl = `${import.meta.env.VITE_API_URL.replace('/api', '')}${res.data.pdfUrl}`;
            window.open(pdfUrl, '_blank');
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Verification failed. Incorrect UHID or report is not verified yet.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="portal-container">
            <div className="portal-header">
                <h2>Patient Portal</h2>
                <p>View & Download Your Lab Reports Securely</p>
            </div>

            <div className="portal-card">
                {!reportData && !loading && (
                    <form onSubmit={handleSearch} className="portal-search-form">
                        <div className="form-group">
                            <label>Scan QR or Enter Invoice ID</label>
                            <input
                                type="text"
                                className="form-input"
                                value={invoiceId}
                                onChange={(e) => setInvoiceId(e.target.value)}
                                placeholder="INV-12345"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '15px' }}>
                            Find Report
                        </button>
                    </form>
                )}

                {loading && <div className="loading" style={{ margin: '30px auto', textAlign: 'center' }}>Searching...</div>}

                {error && <div className="portal-error" style={{ color: 'red', marginTop: '20px', textAlign: 'center' }}>{error}</div>}

                {reportData && !loading && (
                    <div className="report-summary">
                        <div className="summary-header">
                            <h3>{reportData.tenantName}</h3>
                            <span className={`badge ${reportData.reports.every(r => r.status === 'VERIFIED') ? 'badge-success' : 'badge-warning'}`}>
                                {reportData.reports.every(r => r.status === 'VERIFIED') ? 'VERIFIED' : 'PENDING / PROCESSING'}
                            </span>
                        </div>

                        <div className="summary-details">
                            <p><strong>Patient:</strong> {reportData.patientName}</p>
                            <p><strong>Invoice ID:</strong> {reportData.invoiceNumber}</p>
                            <p><strong>Date:</strong> {new Date(reportData.date).toLocaleDateString()}</p>
                        </div>

                        <div className="test-list">
                            <h4>Tests Include:</h4>
                            <ul>
                                {reportData.reports.map((r, i) => (
                                    <li key={i}>{r.name} - <em>{r.status}</em></li>
                                ))}
                            </ul>
                        </div>

                        <hr style={{ margin: '20px 0', border: '1px solid #eee' }} />

                        <form onSubmit={handleDownload} className="download-form">
                            <h4>Authentication Required</h4>
                            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>To download the official report PDF, please confirm your exact Patient UHID.</p>

                            <div className="form-group">
                                <label>Enter your UHID</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={uhid}
                                    onChange={(e) => setUhid(e.target.value)}
                                    placeholder="e.g. UHID-1002"
                                    required
                                />
                            </div>

                            {authError && <div className="portal-error" style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>{authError}</div>}

                            <button type="submit" className="btn btn-primary" disabled={downloading} style={{ width: '100%' }}>
                                {downloading ? 'Authenticating...' : '📍 Verify & Download PDF'}
                            </button>
                        </form>

                        <button onClick={() => { setReportData(null); setInvoiceId(''); navigate('/portal'); }} className="btn btn-secondary" style={{ width: '100%', marginTop: '10px' }}>
                            Search Another Report
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Portal;
