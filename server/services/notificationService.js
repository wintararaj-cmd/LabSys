/**
 * Notification Service — SMS & WhatsApp Gateway
 *
 * Supported Providers:
 *   - FAST2SMS (Indian market, cheapest transactional SMS)
 *   - MSG91   (Indian market, DLT-compliant SMS + WhatsApp)
 *   - TWILIO  (International, SMS + WhatsApp Business API)
 *
 * To activate: configure in the Settings page → Notifications tab.
 * API keys are stored encrypted per-tenant in notification_settings table.
 */

const axios = require('axios');
const { query } = require('../config/db');

// ─────────────────────────────────────────────
// Template engine: replace {name}, {test}, etc.
// ─────────────────────────────────────────────
const renderTemplate = (template, vars) => {
    return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
};

// ─────────────────────────────────────────────
// Load notification settings for a tenant
// ─────────────────────────────────────────────
const getSettings = async (tenantId) => {
    const res = await query(
        'SELECT * FROM notification_settings WHERE tenant_id = $1',
        [tenantId]
    );
    return res.rows[0] || null;
};

// ─────────────────────────────────────────────
// Save a log entry regardless of outcome
// ─────────────────────────────────────────────
const saveLog = async ({ tenantId, patientId, invoiceId, channel, phone, message, status, providerResponse, errorMessage }) => {
    try {
        await query(
            `INSERT INTO notification_logs
             (tenant_id, patient_id, invoice_id, channel, phone, message, status, provider_response, error_message)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [tenantId, patientId || null, invoiceId || null, channel, phone, message,
                status, providerResponse || null, errorMessage || null]
        );
    } catch (err) {
        console.error('[Notifications] Log save error:', err.message);
    }
};

// ─────────────────────────────────────────────
// Provider: FAST2SMS  (fast2sms.com)
// ─────────────────────────────────────────────
const sendFast2SMS = async (apiKey, phone, message, senderId = 'LABSYS') => {
    const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
            route: 'q',              // transactional DLT route
            numbers: phone,
            message,
            language: 'english',
            sender_id: senderId
        },
        {
            headers: { authorization: apiKey },
            timeout: 8000
        }
    );
    return response.data;
};

// ─────────────────────────────────────────────
// Provider: MSG91 (msg91.com)
// ─────────────────────────────────────────────
const sendMSG91 = async (apiKey, phone, message, senderId = 'LABSYS') => {
    const response = await axios.post(
        'https://api.msg91.com/api/v5/flow/',
        {
            sender: senderId,
            route: '4',
            country: '91',
            sms: [{ mobiles: `91${phone}`, message }]
        },
        {
            headers: { authkey: apiKey, 'content-type': 'application/json' },
            timeout: 8000
        }
    );
    return response.data;
};

// ─────────────────────────────────────────────
// Provider: Twilio SMS
// ─────────────────────────────────────────────
const sendTwilio = async (apiKey, phone, message) => {
    // apiKey format: "accountSid:authToken:fromNumber"
    const [accountSid, authToken, fromNumber] = apiKey.split(':');
    const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({ From: fromNumber, To: `+91${phone}`, Body: message }),
        {
            auth: { username: accountSid, password: authToken },
            timeout: 8000
        }
    );
    return response.data;
};

// ─────────────────────────────────────────────
// WhatsApp: configurable webhook URL (works with
// WA Business API, AiSensy, Interakt, Wati, etc.)
// ─────────────────────────────────────────────
const sendWhatsApp = async (webhookUrl, token, phone, message) => {
    const response = await axios.post(
        webhookUrl,
        { phone: `91${phone}`, message },
        {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            timeout: 10000
        }
    );
    return response.data;
};

// ─────────────────────────────────────────────
// Core dispatcher — SMS
// ─────────────────────────────────────────────
const sendSMS = async (settings, phone, message, { tenantId, patientId, invoiceId } = {}) => {
    if (!settings?.sms_enabled || !settings?.api_key) {
        console.log('[Notifications] SMS disabled or no API key configured.');
        return { skipped: true };
    }

    const cleanPhone = phone?.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
        console.warn('[Notifications] Invalid phone number:', phone);
        return { error: 'invalid_phone' };
    }

    let providerResponse, errorMessage, status = 'SENT';

    try {
        if (settings.provider === 'FAST2SMS') {
            providerResponse = JSON.stringify(await sendFast2SMS(settings.api_key, cleanPhone, message, settings.sender_id));
        } else if (settings.provider === 'MSG91') {
            providerResponse = JSON.stringify(await sendMSG91(settings.api_key, cleanPhone, message, settings.sender_id));
        } else if (settings.provider === 'TWILIO') {
            providerResponse = JSON.stringify(await sendTwilio(settings.api_key, cleanPhone, message));
        } else {
            throw new Error(`Unknown provider: ${settings.provider}`);
        }
        console.log(`[Notifications] SMS sent to ${cleanPhone} via ${settings.provider}`);
    } catch (err) {
        status = 'FAILED';
        errorMessage = err.message;
        console.error(`[Notifications] SMS failed to ${cleanPhone}:`, err.message);
    }

    await saveLog({ tenantId, patientId, invoiceId, channel: 'SMS', phone: cleanPhone, message, status, providerResponse, errorMessage });
    return { status, error: errorMessage };
};

// ─────────────────────────────────────────────
// Core dispatcher — WhatsApp
// ─────────────────────────────────────────────
const sendWhatsAppMsg = async (settings, phone, message, { tenantId, patientId, invoiceId } = {}) => {
    if (!settings?.whatsapp_enabled || !settings?.whatsapp_api_url || !settings?.whatsapp_token) {
        console.log('[Notifications] WhatsApp disabled or not configured.');
        return { skipped: true };
    }

    const cleanPhone = phone?.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) return { error: 'invalid_phone' };

    let providerResponse, errorMessage, status = 'SENT';

    try {
        providerResponse = JSON.stringify(await sendWhatsApp(settings.whatsapp_api_url, settings.whatsapp_token, cleanPhone, message));
        console.log(`[Notifications] WhatsApp sent to ${cleanPhone}`);
    } catch (err) {
        status = 'FAILED';
        errorMessage = err.message;
        console.error(`[Notifications] WhatsApp failed to ${cleanPhone}:`, err.message);
    }

    await saveLog({ tenantId, patientId, invoiceId, channel: 'WHATSAPP', phone: cleanPhone, message, status, providerResponse, errorMessage });
    return { status, error: errorMessage };
};

// ─────────────────────────────────────────────
// High-level event triggers
// ─────────────────────────────────────────────

/**
 * Trigger when a patient invoice is created
 */
const notifyInvoiceCreated = async (tenantId, { patientName, patientPhone, patientId, invoiceId, invoiceNumber, amount, balance }) => {
    try {
        const settings = await getSettings(tenantId);
        if (!settings?.notify_on_invoice_created) return;

        const vars = { name: patientName, invoice: invoiceNumber, amount: parseFloat(amount).toFixed(2), balance: parseFloat(balance).toFixed(2) };
        const message = renderTemplate(settings.invoice_template, vars);

        await Promise.all([
            sendSMS(settings, patientPhone, message, { tenantId, patientId, invoiceId }),
            sendWhatsAppMsg(settings, patientPhone, message, { tenantId, patientId, invoiceId })
        ]);
    } catch (err) {
        console.error('[Notifications] notifyInvoiceCreated error:', err.message);
    }
};

/**
 * Trigger when a lab report result is entered (COMPLETED)
 */
const notifyReportReady = async (tenantId, { patientName, patientPhone, patientId, invoiceId, testName, invoiceNumber, portalLink }) => {
    try {
        const settings = await getSettings(tenantId);
        if (!settings?.notify_on_report_ready) return;

        const vars = { name: patientName, test: testName, invoice: invoiceNumber, link: portalLink };
        const message = renderTemplate(settings.report_ready_template, vars);

        await Promise.all([
            sendSMS(settings, patientPhone, message, { tenantId, patientId, invoiceId }),
            sendWhatsAppMsg(settings, patientPhone, message, { tenantId, patientId, invoiceId })
        ]);
    } catch (err) {
        console.error('[Notifications] notifyReportReady error:', err.message);
    }
};

/**
 * Trigger when a report is verified by pathologist/doctor
 */
const notifyReportVerified = async (tenantId, { patientName, patientPhone, patientId, invoiceId, invoiceNumber, portalLink }) => {
    try {
        const settings = await getSettings(tenantId);
        if (!settings?.notify_on_report_verified) return;

        const vars = { name: patientName, invoice: invoiceNumber, link: portalLink };
        const message = renderTemplate(settings.report_verified_template, vars);

        await Promise.all([
            sendSMS(settings, patientPhone, message, { tenantId, patientId, invoiceId }),
            sendWhatsAppMsg(settings, patientPhone, message, { tenantId, patientId, invoiceId })
        ]);
    } catch (err) {
        console.error('[Notifications] notifyReportVerified error:', err.message);
    }
};

module.exports = {
    getSettings,
    renderTemplate,
    sendSMS,
    sendWhatsAppMsg,
    notifyInvoiceCreated,
    notifyReportReady,
    notifyReportVerified
};
