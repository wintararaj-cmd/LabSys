import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { backupAPI, authAPI } from '../services/api';
import api from '../services/api';
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

    // Notification settings state
    const [notifSettings, setNotifSettings] = useState({
        smsEnabled: false,
        whatsappEnabled: false,
        provider: 'FAST2SMS',
        apiKey: '',
        senderId: '',
        whatsappApiUrl: '',
        whatsappToken: '',
        notifyOnReportReady: true,
        notifyOnReportVerified: true,
        notifyOnInvoiceCreated: true,
        reportReadyTemplate: 'Dear {name}, your report for {test} is ready. Download: {link}',
        reportVerifiedTemplate: 'Dear {name}, your report has been verified. Invoice: {invoice}. Download: {link}',
        invoiceTemplate: 'Dear {name}, invoice {invoice} of Rs.{amount} created. Balance: Rs.{balance}'
    });
    const [notifLoading, setNotifLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testChannel, setTestChannel] = useState('SMS');
    const [notifLogs, setNotifLogs] = useState([]);
    const [notifLogsLoading, setNotifLogsLoading] = useState(false);

    // Change password state
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState({ type: '', text: '' });

    useEffect(() => {
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

    useEffect(() => {
        if (activeTab === 'notifications') {
            loadNotifSettings();
            loadNotifLogs();
        }
    }, [activeTab]);

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

    const loadNotifSettings = async () => {
        try {
            const res = await api.get('/notifications/settings');
            const s = res.data.settings;
            setNotifSettings({
                smsEnabled: s.sms_enabled || false,
                whatsappEnabled: s.whatsapp_enabled || false,
                provider: s.provider || 'FAST2SMS',
                apiKey: s.api_key_masked || s.api_key || '',
                senderId: s.sender_id || '',
                whatsappApiUrl: s.whatsapp_api_url || '',
                whatsappToken: s.whatsapp_token_masked || s.whatsapp_token || '',
                notifyOnReportReady: s.notify_on_report_ready !== false,
                notifyOnReportVerified: s.notify_on_report_verified !== false,
                notifyOnInvoiceCreated: s.notify_on_invoice_created !== false,
                reportReadyTemplate: s.report_ready_template || '',
                reportVerifiedTemplate: s.report_verified_template || '',
                invoiceTemplate: s.invoice_template || ''
            });
        } catch (err) {
            console.error('Failed to load notification settings', err);
        }
    };

    const loadNotifLogs = async () => {
        try {
            setNotifLogsLoading(true);
            const res = await api.get('/notifications/logs', { params: { limit: 20 } });
            setNotifLogs(res.data.logs || []);
        } catch (err) {
            console.error('Failed to load notification logs', err);
        } finally {
            setNotifLogsLoading(false);
        }
    };

    const handleSaveNotifications = async (e) => {
        e.preventDefault();
        try {
            setNotifLoading(true);
            await api.post('/notifications/settings', notifSettings);
            setMessage({ type: 'success', text: 'Notification settings saved!' });
            await loadNotifSettings();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save settings' });
        } finally {
            setNotifLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        }
    };

    const handleTestSend = async () => {
        if (!testPhone) return alert('Enter a test phone number first.');
        try {
            setNotifLoading(true);
            await api.post('/notifications/test-send', { phone: testPhone, channel: testChannel });
            setMessage({ type: 'success', text: `Test ${testChannel} sent to ${testPhone} successfully!` });
            loadNotifLogs();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Test send failed.' });
        } finally {
            setNotifLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        }
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

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwMessage({ type: '', text: '' });

        if (pwForm.newPassword !== pwForm.confirmPassword) {
            return setPwMessage({ type: 'error', text: 'New passwords do not match.' });
        }
        if (pwForm.newPassword.length < 6) {
            return setPwMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
        }

        try {
            setPwLoading(true);
            await authAPI.changePassword({
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            setPwMessage({ type: 'success', text: '✅ Password changed successfully!' });
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setPwMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password.' });
        } finally {
            setPwLoading(false);
        }
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
                    <button
                        className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <span>📲</span> Notifications
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
                            <h3>🔒 Security &amp; Password</h3>
                            <p style={{ color: '#7f8c8d', marginBottom: '20px', fontSize: '13px' }}>
                                Update your account password. You will need your current password to make this change.
                            </p>

                            <div style={{ maxWidth: '460px' }}>
                                {pwMessage.text && (
                                    <div className={`alert alert-${pwMessage.type}`} style={{ marginBottom: '16px' }}>
                                        {pwMessage.text}
                                    </div>
                                )}

                                <form onSubmit={handleChangePassword}>
                                    <div className="form-group">
                                        <label className="form-label">Current Password</label>
                                        <input
                                            id="current-password"
                                            type="password"
                                            className="form-input"
                                            placeholder="Enter current password"
                                            value={pwForm.currentPassword}
                                            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">New Password</label>
                                        <input
                                            id="new-password"
                                            type="password"
                                            className="form-input"
                                            placeholder="Min. 6 characters"
                                            value={pwForm.newPassword}
                                            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Confirm New Password</label>
                                        <input
                                            id="confirm-password"
                                            type="password"
                                            className="form-input"
                                            placeholder="Re-enter new password"
                                            value={pwForm.confirmPassword}
                                            onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={pwLoading}
                                        style={{ marginTop: '8px' }}
                                    >
                                        {pwLoading ? 'Changing...' : '🔑 Change Password'}
                                    </button>
                                </form>

                                <div className="info-box blue" style={{ marginTop: '24px' }}>
                                    <h4>Session Security</h4>
                                    <p>Your session is stored in the browser's session storage. Closing the browser will automatically log you out for security.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── NOTIFICATIONS TAB ─────────────────────────────────── */}
                    {activeTab === 'notifications' && (
                        <div className="tab-pane">
                            <h3>📲 Notifications — SMS &amp; WhatsApp</h3>
                            <p style={{ color: '#7f8c8d', marginBottom: '16px', fontSize: '13px' }}>
                                Configure automated patient notifications for key events. Supports Fast2SMS, MSG91, and Twilio for SMS; custom webhook for WhatsApp Business API.
                            </p>

                            <form onSubmit={handleSaveNotifications}>
                                {/* Provider selection */}
                                <div className="notif-section">
                                    <h4>📡 Provider Configuration</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">SMS Provider</label>
                                            <select
                                                className="form-select"
                                                value={notifSettings.provider}
                                                onChange={e => setNotifSettings({ ...notifSettings, provider: e.target.value })}
                                            >
                                                <option value="FAST2SMS">Fast2SMS (India — Cheapest)</option>
                                                <option value="MSG91">MSG91 (India — DLT Compliant)</option>
                                                <option value="TWILIO">Twilio (International)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Sender ID / Header</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. LABSYS"
                                                value={notifSettings.senderId}
                                                onChange={e => setNotifSettings({ ...notifSettings, senderId: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            API Key
                                            {notifSettings.provider === 'TWILIO' && <small style={{ color: '#888', marginLeft: '8px' }}>Format: AccountSid:AuthToken:FromNumber</small>}
                                        </label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder={notifSettings.apiKey ? 'Key saved — enter new to replace' : 'Enter API key...'}
                                            value={notifSettings.apiKey}
                                            onChange={e => setNotifSettings({ ...notifSettings, apiKey: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* WhatsApp config */}
                                <div className="notif-section">
                                    <h4>💬 WhatsApp Business API</h4>
                                    <p style={{ fontSize: '12px', color: '#888' }}>Works with AiSensy, Interakt, Wati, or any API that accepts a POST with <code>{'{'}phone, message{'}'}</code>.</p>
                                    <div className="form-group">
                                        <label className="form-label">Webhook URL</label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            placeholder="https://your-wa-provider.com/api/send"
                                            value={notifSettings.whatsappApiUrl}
                                            onChange={e => setNotifSettings({ ...notifSettings, whatsappApiUrl: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Bearer Token</label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder={notifSettings.whatsappToken ? 'Token saved — enter new to replace' : 'WhatsApp API token...'}
                                            value={notifSettings.whatsappToken}
                                            onChange={e => setNotifSettings({ ...notifSettings, whatsappToken: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Channel toggles */}
                                <div className="notif-section">
                                    <h4>🔔 Enable Channels</h4>
                                    <div className="settings-toggles">
                                        <div className="toggle-group">
                                            <div className="toggle-info">
                                                <strong>Enable SMS</strong>
                                                <p>Send SMS to patients via your configured provider</p>
                                            </div>
                                            <label className="switch">
                                                <input type="checkbox" checked={notifSettings.smsEnabled}
                                                    onChange={e => setNotifSettings({ ...notifSettings, smsEnabled: e.target.checked })} />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                        <div className="toggle-group">
                                            <div className="toggle-info">
                                                <strong>Enable WhatsApp</strong>
                                                <p>Send messages via WhatsApp Business API</p>
                                            </div>
                                            <label className="switch">
                                                <input type="checkbox" checked={notifSettings.whatsappEnabled}
                                                    onChange={e => setNotifSettings({ ...notifSettings, whatsappEnabled: e.target.checked })} />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Event toggles */}
                                <div className="notif-section">
                                    <h4>⚡ Trigger Events</h4>
                                    <div className="settings-toggles">
                                        {[
                                            { key: 'notifyOnInvoiceCreated', label: 'Invoice Created', desc: 'Notify patient when a new invoice is raised' },
                                            { key: 'notifyOnReportReady', label: 'Report Ready (Completed)', desc: 'Notify patient when test result is entered' },
                                            { key: 'notifyOnReportVerified', label: 'Report Verified', desc: 'Notify patient when report is verified by pathologist' },
                                        ].map(({ key, label, desc }) => (
                                            <div className="toggle-group" key={key}>
                                                <div className="toggle-info">
                                                    <strong>{label}</strong>
                                                    <p>{desc}</p>
                                                </div>
                                                <label className="switch">
                                                    <input type="checkbox" checked={notifSettings[key]}
                                                        onChange={e => setNotifSettings({ ...notifSettings, [key]: e.target.checked })} />
                                                    <span className="slider round"></span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Message Templates */}
                                <div className="notif-section">
                                    <h4>✏️ Message Templates</h4>
                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                                        Supported variables: <code>{'{name}'}</code> <code>{'{test}'}</code> <code>{'{invoice}'}</code> <code>{'{amount}'}</code> <code>{'{balance}'}</code> <code>{'{link}'}</code>
                                    </p>
                                    {[
                                        { key: 'invoiceTemplate', label: 'Invoice Created' },
                                        { key: 'reportReadyTemplate', label: 'Report Ready' },
                                        { key: 'reportVerifiedTemplate', label: 'Report Verified' },
                                    ].map(({ key, label }) => (
                                        <div className="form-group" key={key}>
                                            <label className="form-label">{label}</label>
                                            <textarea
                                                className="form-input"
                                                rows={2}
                                                value={notifSettings[key]}
                                                onChange={e => setNotifSettings({ ...notifSettings, [key]: e.target.value })}
                                                maxLength={160}
                                            />
                                            <small style={{ color: '#aaa' }}>{notifSettings[key]?.length || 0}/160 chars</small>
                                        </div>
                                    ))}
                                </div>

                                <button type="submit" className="btn btn-primary" disabled={notifLoading}>
                                    {notifLoading ? 'Saving...' : '💾 Save Notification Settings'}
                                </button>
                            </form>

                            {/* Test Send */}
                            <div className="notif-section" style={{ marginTop: '24px' }}>
                                <h4>🧪 Test Send</h4>
                                <p style={{ fontSize: '12px', color: '#888' }}>Send a test message to verify your configuration is working.</p>
                                <div className="form-row" style={{ alignItems: 'flex-end', gap: '10px' }}>
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label className="form-label">Test Phone Number (10 digits)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="9876543210"
                                            value={testPhone}
                                            onChange={e => setTestPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Channel</label>
                                        <select className="form-select" value={testChannel} onChange={e => setTestChannel(e.target.value)}>
                                            <option value="SMS">SMS</option>
                                            <option value="WHATSAPP">WhatsApp</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleTestSend}
                                        disabled={notifLoading}
                                        style={{ height: '38px', marginBottom: '0' }}
                                    >
                                        📨 Send Test
                                    </button>
                                </div>
                            </div>

                            {/* Recent Notification Logs */}
                            <div className="notif-section" style={{ marginTop: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4>📋 Recent Notification Activity</h4>
                                    <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={loadNotifLogs}>↺ Refresh</button>
                                </div>
                                {notifLogsLoading ? (
                                    <div className="loading"><div className="spinner"></div></div>
                                ) : notifLogs.length === 0 ? (
                                    <p style={{ color: '#aaa', fontSize: '13px', marginTop: '8px' }}>No notifications sent yet.</p>
                                ) : (
                                    <div className="table-container" style={{ marginTop: '10px' }}>
                                        <table className="table" style={{ fontSize: '12px' }}>
                                            <thead>
                                                <tr>
                                                    <th>Time</th>
                                                    <th>Patient</th>
                                                    <th>Channel</th>
                                                    <th>Phone</th>
                                                    <th>Status</th>
                                                    <th>Message (preview)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {notifLogs.map(log => (
                                                    <tr key={log.id}>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                                                        <td>{log.patient_name || '—'}</td>
                                                        <td>
                                                            <span style={{ background: log.channel === 'SMS' ? '#2980b9' : '#27ae60', color: '#fff', padding: '2px 7px', borderRadius: '10px', fontSize: '10px' }}>
                                                                {log.channel}
                                                            </span>
                                                        </td>
                                                        <td><code>{log.phone}</code></td>
                                                        <td>
                                                            <span style={{ color: log.status === 'SENT' ? '#27ae60' : log.status === 'FAILED' ? '#e74c3c' : '#f39c12', fontWeight: '600' }}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                                                            {log.message}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
