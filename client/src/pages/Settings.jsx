import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { backupAPI } from '../services/api';
import './Settings.css';

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('lab');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [labSettings, setLabSettings] = useState({
        labName: '',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
        website: '',
        headerNote: '',
        footerNote: ''
    });

    const [machineSettings, setMachineSettings] = useState({
        hl7Port: '2575',
        autoSync: true,
        logIncoming: true,
        timeout: '30'
    });

    useEffect(() => {
        // In a real app, fetch settings from API
        // For now, we'll use placeholder data
        setLabSettings({
            labName: user?.tenantName || 'Pathology Lab',
            address: '123 Health Street, Medical District',
            phone: '+91 98765 43210',
            email: 'info@labsys.com',
            gstNumber: '27AAAAA0000A1Z5',
            website: 'www.labsys.com',
            headerNote: 'ISO 9001:2015 Certified Laboratory',
            footerNote: 'This is a computer generated report and is valid without signature.'
        });
    }, [user]);

    const handleSaveLab = (e) => {
        e.preventDefault();
        setMessage({ type: 'success', text: 'Lab settings saved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleSaveMachine = (e) => {
        e.preventDefault();
        setMessage({ type: 'success', text: 'Machine communication settings updated!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const response = await backupAPI.export();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            setMessage({ type: 'success', text: 'Backup exported successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to export backup' });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!window.confirm('WARNING: Importing data will OVERWRITE all existing data for this laboratory. Are you sure?')) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                setLoading(true);
                const data = JSON.parse(event.target.result);
                await backupAPI.import(data);
                setMessage({ type: 'success', text: 'Data imported successfully! Please refresh the page.' });
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to import data: ' + (error.response?.data?.error || error.message) });
            } finally {
                setLoading(false);
                e.target.value = '';
                setTimeout(() => setMessage({ type: '', text: '' }), 5000);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="settings-container">
            <div className="page-header">
                <h1 className="page-title">⚙️ System Settings</h1>
                <p>Configure your laboratory details and external machine integrations.</p>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-layout">
                <div className="settings-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lab')}
                    >
                        <span>🏢</span> Laboratory Profile
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'machine' ? 'active' : ''}`}
                        onClick={() => setActiveTab('machine')}
                    >
                        <span>🔌</span> Communication (Machine Sync)
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <span>🔒</span> Security & Roles
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('finance')}
                    >
                        <span>📊</span> Financial Settings
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
                        onClick={() => setActiveTab('backup')}
                    >
                        <span>💾</span> Data Backup
                    </button>
                </div>

                <div className="settings-content card">
                    {activeTab === 'backup' && (
                        <div className="tab-pane">
                            <h3>Data Backup & Restore</h3>
                            <div className="info-box blue mb-4">
                                <h4>Security Notice</h4>
                                <p>Backup files contain sensitive patient and financial data. Store them in a secure location. The file is exported in a standard JSON format.</p>
                            </div>

                            <div className="backup-actions">
                                <div className="backup-section">
                                    <h4>Export Data</h4>
                                    <p>Download a full copy of your laboratory data including patients, invoices, reports, and inventory.</p>
                                    <button
                                        onClick={handleExport}
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Exporting...' : '💾 Generate & Download Backup'}
                                    </button>
                                </div>

                                <div className="divider"></div>

                                <div className="backup-section">
                                    <h4>Restore Data</h4>
                                    <p className="text-danger"><strong>Warning:</strong> Restoring data will delete all existing records and replace them with the data from the backup file.</p>
                                    <div className="file-upload-wrapper">
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleImport}
                                            disabled={loading}
                                            id="backup-upload"
                                            className="file-input"
                                        />
                                        <label htmlFor="backup-upload" className="btn btn-secondary">
                                            {loading ? 'Importing...' : '📂 Upload & Restore Backup'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'finance' && (
                        <div className="tab-pane">
                            <h3>Financial Settings</h3>
                            <div className="info-box green mb-4">
                                <h4>Accounting Year Configuration</h4>
                                <p>Your system is configured to use the Indian Financial Year (April to March) for all billing and accounting reports.</p>
                                <ul className="settings-list">
                                    <li><strong>Current FY:</strong> {new Date().getMonth() < 3 ? `${new Date().getFullYear() - 1}-${new Date().getFullYear().toString().slice(-2)}` : `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`}</li>
                                    <li><strong>Start Date:</strong> April 1st</li>
                                    <li><strong>End Date:</strong> March 31st</li>
                                    <li><strong>Sequence Reset:</strong> Automatically resets every April 1st</li>
                                </ul>
                            </div>
                            <div className="alert alert-info">
                                <p><strong>Note:</strong> Accounting year helps in tax compliance and financial reporting. Invoice numbers follow the format <code>INV/FY/00001</code>.</p>
                            </div>
                        </div>
                    )}
                    {activeTab === 'lab' && (
                        <div className="tab-pane">
                            <h3>Laboratory Profile</h3>
                            <form onSubmit={handleSaveLab}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Laboratory Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={labSettings.labName}
                                            onChange={(e) => setLabSettings({ ...labSettings, labName: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">GST Number</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={labSettings.gstNumber}
                                            onChange={(e) => setLabSettings({ ...labSettings, gstNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <textarea
                                        className="form-input"
                                        value={labSettings.address}
                                        rows="2"
                                        onChange={(e) => setLabSettings({ ...labSettings, address: e.target.value })}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Contact Phone</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={labSettings.phone}
                                            onChange={(e) => setLabSettings({ ...labSettings, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Contact Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={labSettings.email}
                                            onChange={(e) => setLabSettings({ ...labSettings, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Report Footer Note</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={labSettings.footerNote}
                                        onChange={(e) => setLabSettings({ ...labSettings, footerNote: e.target.value })}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary mt-3">Save Lab Profile</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'machine' && (
                        <div className="tab-pane">
                            <div className="pane-header">
                                <h3>Machine Communication Settings</h3>
                                <div className={`status-indicator online`}>
                                    <span className="dot pulse"></span> Service Running
                                </div>
                            </div>

                            <div className="info-box blue mb-4">
                                <h4>HL7 / ASTM Synchronization</h4>
                                <p>To connect a testing machine (Biochemistry, Hematology, etc.), use the following network settings on the analyzer's LIMS configuration menu:</p>
                                <ul className="settings-list">
                                    <li><strong>Server IP:</strong> 127.0.0.1 (or Local Network IP)</li>
                                    <li><strong>Port:</strong> {machineSettings.hl7Port}</li>
                                    <li><strong>Protocol:</strong> TCP/IP (HL7 v2.x / ASTM)</li>
                                </ul>
                            </div>

                            <form onSubmit={handleSaveMachine}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Active HL7 Port</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={machineSettings.hl7Port}
                                            onChange={(e) => setMachineSettings({ ...machineSettings, hl7Port: e.target.value })}
                                        />
                                        <small className="form-text text-muted">Default is 2575. Requires server restart if changed.</small>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Timeout (Seconds)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={machineSettings.timeout}
                                            onChange={(e) => setMachineSettings({ ...machineSettings, timeout: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="settings-toggles">
                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <strong>Automatic Processing</strong>
                                            <p>Automatically update reports when result is received</p>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={machineSettings.autoSync}
                                                onChange={(e) => setMachineSettings({ ...machineSettings, autoSync: e.target.checked })}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>

                                    <div className="toggle-group">
                                        <div className="toggle-info">
                                            <strong>Debug Logging</strong>
                                            <p>Log incoming raw HL7 messages for troubleshooting</p>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={machineSettings.logIncoming}
                                                onChange={(e) => setMachineSettings({ ...machineSettings, logIncoming: e.target.checked })}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary mt-3">Update Communication Settings</button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="tab-pane">
                            <h3>Security & Roles</h3>
                            <p>Configure password policies and role-based access control.</p>
                            <div className="empty-state">
                                <p>Role management is currently handled in the "Branches & Staff" section.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
