const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');
const notificationService = require('../services/notificationService');

router.use(verifyToken);
router.use(tenantGuard);

// ── GET current settings ──────────────────────────────────────────────────────
router.get('/settings', checkRole(['ADMIN']), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await query(
            'SELECT * FROM notification_settings WHERE tenant_id = $1',
            [tenantId]
        );

        if (result.rows.length === 0) {
            // Return defaults
            return res.json({
                settings: {
                    sms_enabled: false,
                    whatsapp_enabled: false,
                    provider: 'FAST2SMS',
                    api_key: '',
                    sender_id: '',
                    whatsapp_api_url: '',
                    whatsapp_token: '',
                    notify_on_report_ready: true,
                    notify_on_report_verified: true,
                    notify_on_invoice_created: true,
                    report_ready_template: 'Dear {name}, your report for {test} is ready. Download: {link}',
                    report_verified_template: 'Dear {name}, your report has been verified. Invoice: {invoice}. Download: {link}',
                    invoice_template: 'Dear {name}, invoice {invoice} of Rs.{amount} created. Balance: Rs.{balance}'
                }
            });
        }

        // Mask api_key for security — only show last 4 chars
        const settings = { ...result.rows[0] };
        if (settings.api_key) {
            settings.api_key_masked = '••••••••' + settings.api_key.slice(-4);
            delete settings.api_key;
        }
        if (settings.whatsapp_token) {
            settings.whatsapp_token_masked = '••••••••' + settings.whatsapp_token.slice(-4);
            delete settings.whatsapp_token;
        }

        res.json({ settings });
    } catch (err) {
        console.error('Get notification settings error:', err);
        res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
});

// ── UPSERT settings ───────────────────────────────────────────────────────────
router.post('/settings', checkRole(['ADMIN']), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const {
            smsEnabled, whatsappEnabled, provider,
            apiKey, senderId,
            whatsappApiUrl, whatsappToken,
            notifyOnReportReady, notifyOnReportVerified, notifyOnInvoiceCreated,
            reportReadyTemplate, reportVerifiedTemplate, invoiceTemplate
        } = req.body;

        // Fetch existing to preserve masked api_key if not being replaced
        const existing = await query('SELECT api_key, whatsapp_token FROM notification_settings WHERE tenant_id = $1', [tenantId]);

        const currentKey = existing.rows[0]?.api_key || '';
        const currentToken = existing.rows[0]?.whatsapp_token || '';

        // Only update key if a new non-masked one is provided
        const finalApiKey = (apiKey && !apiKey.startsWith('••••')) ? apiKey : currentKey;
        const finalToken = (whatsappToken && !whatsappToken.startsWith('••••')) ? whatsappToken : currentToken;

        await query(
            `INSERT INTO notification_settings
             (tenant_id, sms_enabled, whatsapp_enabled, provider, api_key, sender_id,
              whatsapp_api_url, whatsapp_token,
              notify_on_report_ready, notify_on_report_verified, notify_on_invoice_created,
              report_ready_template, report_verified_template, invoice_template, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
             ON CONFLICT (tenant_id) DO UPDATE SET
               sms_enabled = EXCLUDED.sms_enabled,
               whatsapp_enabled = EXCLUDED.whatsapp_enabled,
               provider = EXCLUDED.provider,
               api_key = EXCLUDED.api_key,
               sender_id = EXCLUDED.sender_id,
               whatsapp_api_url = EXCLUDED.whatsapp_api_url,
               whatsapp_token = EXCLUDED.whatsapp_token,
               notify_on_report_ready = EXCLUDED.notify_on_report_ready,
               notify_on_report_verified = EXCLUDED.notify_on_report_verified,
               notify_on_invoice_created = EXCLUDED.notify_on_invoice_created,
               report_ready_template = EXCLUDED.report_ready_template,
               report_verified_template = EXCLUDED.report_verified_template,
               invoice_template = EXCLUDED.invoice_template,
               updated_at = NOW()`,
            [
                tenantId, smsEnabled || false, whatsappEnabled || false,
                provider || 'FAST2SMS', finalApiKey, senderId || '',
                whatsappApiUrl || '', finalToken,
                notifyOnReportReady !== false, notifyOnReportVerified !== false, notifyOnInvoiceCreated !== false,
                reportReadyTemplate || 'Dear {name}, your report for {test} is ready. Download: {link}',
                reportVerifiedTemplate || 'Dear {name}, your report has been verified. Invoice: {invoice}. Download: {link}',
                invoiceTemplate || 'Dear {name}, invoice {invoice} of Rs.{amount} created. Balance: Rs.{balance}'
            ]
        );

        res.json({ message: 'Notification settings saved successfully' });
    } catch (err) {
        console.error('Save notification settings error:', err);
        res.status(500).json({ error: 'Failed to save notification settings' });
    }
});

// ── Test send ─────────────────────────────────────────────────────────────────
router.post('/test-send', checkRole(['ADMIN']), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { phone, channel } = req.body;

        if (!phone) return res.status(400).json({ error: 'Phone number is required' });

        const settings = await notificationService.getSettings(tenantId);
        if (!settings) return res.status(400).json({ error: 'Notification settings not configured yet.' });

        const message = `LabSys Test Notification: This is a test message from your Lab Management System. If received, your ${channel} integration is working correctly! ✅`;

        let result;
        if (channel === 'WHATSAPP') {
            result = await notificationService.sendWhatsAppMsg(settings, phone, message, { tenantId });
        } else {
            result = await notificationService.sendSMS(settings, phone, message, { tenantId });
        }

        if (result.skipped) return res.status(400).json({ error: `${channel} is disabled or not configured.` });
        if (result.status === 'FAILED') return res.status(500).json({ error: `Send failed: ${result.error}` });

        res.json({ message: `Test ${channel} sent successfully to ${phone}` });
    } catch (err) {
        console.error('Test send error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ── GET notification logs ─────────────────────────────────────────────────────
router.get('/logs', checkRole(['ADMIN']), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { page = 1, limit = 50, channel, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let conditions = ['nl.tenant_id = $1'];
        let params = [tenantId];
        let p = 1;

        if (channel) { p++; conditions.push(`nl.channel = $${p}`); params.push(channel.toUpperCase()); }
        if (status) { p++; conditions.push(`nl.status = $${p}`); params.push(status.toUpperCase()); }

        const where = conditions.join(' AND ');

        const dataRes = await query(
            `SELECT nl.*, p.name as patient_name
             FROM notification_logs nl
             LEFT JOIN patients p ON nl.patient_id = p.id
             WHERE ${where}
             ORDER BY nl.created_at DESC
             LIMIT $${p + 1} OFFSET $${p + 2}`,
            [...params, parseInt(limit), offset]
        );

        const countRes = await query(
            `SELECT COUNT(*) FROM notification_logs nl WHERE ${where}`,
            params
        );

        res.json({
            logs: dataRes.rows,
            total: parseInt(countRes.rows[0].count),
            page: parseInt(page),
            totalPages: Math.ceil(parseInt(countRes.rows[0].count) / parseInt(limit))
        });
    } catch (err) {
        console.error('Get notification logs error:', err);
        res.status(500).json({ error: 'Failed to fetch notification logs' });
    }
});

module.exports = router;
