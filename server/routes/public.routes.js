const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Verify invoice / fetch basic info for QR scan
router.get('/verify/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const result = await query(
            `SELECT i.invoice_number, i.payment_status, p.name as patient_name, 
                    p.uhid, t.name as tenant_name, i.created_at
             FROM invoices i
             JOIN patients p ON i.patient_id = p.id
             JOIN tenants t ON i.tenant_id = t.id
             WHERE i.id = $1`, [invoiceId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

        const data = result.rows[0];

        // Hide full patient name for privacy
        const maskedName = data.patient_name.length > 2
            ? data.patient_name.charAt(0) + '****' + data.patient_name.slice(-1)
            : data.patient_name;

        // Fetch reports statuses
        const reportsRes = await query(
            `SELECT t.name, r.status 
             FROM reports r
             JOIN tests t ON r.test_id = t.id
             WHERE r.invoice_id = $1`, [invoiceId]
        );

        res.json({
            tenantName: data.tenant_name,
            invoiceNumber: data.invoice_number,
            date: data.created_at,
            patientName: maskedName,
            status: data.payment_status,
            reports: reportsRes.rows
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Download PDF if they provide correct UHID
router.post('/download/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { uhid } = req.body;

        const result = await query(
            `SELECT r.report_pdf_url 
             FROM reports r
             JOIN invoices i ON r.invoice_id = i.id
             JOIN patients p ON i.patient_id = p.id
             WHERE i.id = $1 AND p.uhid = $2 AND r.status = 'VERIFIED'
             LIMIT 1`, [invoiceId, uhid]
        );

        if (result.rows.length === 0 || !result.rows[0].report_pdf_url) {
            return res.status(404).json({ error: 'Report not found, not ready, or invalid UHID.' });
        }

        res.json({ pdfUrl: result.rows[0].report_pdf_url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
