const { query } = require('../config/db');
const radiologyService = require('../services/radiologyService');
const path = require('path');

const getRadiologyReports = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await query(
            `SELECT r.*, t.name as test_name, t.category as test_category,
                    p.name as patient_name, p.age, p.gender, p.uhid,
                    i.invoice_number, d.name as doctor_name
             FROM reports r
             JOIN tests t ON r.test_id = t.id
             JOIN invoices i ON r.invoice_id = i.id
             JOIN patients p ON i.patient_id = p.id
             LEFT JOIN doctors d ON i.doctor_id = d.id
             WHERE i.tenant_id = $1 AND t.category IN ('Radiology', 'X-ray', 'USG', 'CT', 'MRI', 'X-RAY')
             ORDER BY i.created_at DESC`,
            [tenantId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get radiology reports error:', error);
        res.status(500).json({ error: 'Failed to fetch radiology reports' });
    }
};

const getReportDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const result = await query(
            `SELECT r.*, t.name as test_name, t.category as test_category,
                    p.name as patient_name, p.age, p.gender, p.uhid,
                    i.invoice_number, d.name as doctor_name,
                    u.name as radiologist_name
             FROM reports r
             JOIN tests t ON r.test_id = t.id
             JOIN invoices i ON r.invoice_id = i.id
             JOIN patients p ON i.patient_id = p.id
             LEFT JOIN doctors d ON i.doctor_id = d.id
             LEFT JOIN users u ON r.pathologist_id = u.id
             WHERE r.id = $1 AND i.tenant_id = $2`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = result.rows[0];

        // Get versions
        const versions = await query(
            `SELECT rv.*, u.name as doctor_name
             FROM report_versions rv
             LEFT JOIN users u ON rv.doctor_id = u.id
             WHERE rv.report_id = $1
             ORDER BY rv.version_number DESC`,
            [id]
        );

        res.json({ report, versions: versions.rows });
    } catch (error) {
        console.error('Get report details error:', error);
        res.status(500).json({ error: 'Failed to fetch report details' });
    }
};

const saveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { findings, impression, isFinal } = req.body;
        const doctorId = req.user.userId;
        const tenantId = req.tenantId;

        // Check if locked
        const checkResult = await query(
            'SELECT is_locked FROM reports r JOIN invoices i ON r.invoice_id = i.id WHERE r.id = $1 AND i.tenant_id = $2',
            [id, tenantId]
        );

        if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        if (checkResult.rows[0].is_locked) return res.status(403).json({ error: 'Report is locked and cannot be edited' });

        // Update main report
        const updateResult = await query(
            `UPDATE reports SET 
                findings = $1, 
                impression = $2, 
                status = $3,
                is_locked = $4,
                pathologist_id = $5
             WHERE id = $6
             RETURNING *`,
            [findings, impression, isFinal ? 'VERIFIED' : 'COMPLETED', isFinal, doctorId, id]
        );

        // Get full data for template replacement
        const fullDataResult = await query(
            `SELECT r.*, t.name as test_name, p.name as patient_name, p.age, p.gender, 
                    d.name as doctor_name, u.name as radiologist_name
             FROM reports r
             JOIN tests t ON r.test_id = t.id
             JOIN invoices i ON r.invoice_id = i.id
             JOIN patients p ON i.patient_id = p.id
             LEFT JOIN doctors d ON i.doctor_id = d.id
             LEFT JOIN users u ON u.id = $1
             WHERE r.id = $2`,
            [doctorId, id]
        );

        const fullData = fullDataResult.rows[0];
        const templateData = {
            patient_name: fullData.patient_name,
            age: fullData.age,
            gender: fullData.gender,
            doctor_name: fullData.doctor_name || 'Self',
            report_date: new Date().toLocaleDateString(),
            findings: fullData.findings,
            impression: fullData.impression,
            radiologist_name: fullData.radiologist_name || 'Doctor',
            report_id: id
        };

        const files = await radiologyService.generateReport(templateData);

        // Save version
        const versionResult = await query(
            'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM report_versions WHERE report_id = $1',
            [id]
        );
        const nextVersion = versionResult.rows[0].next_version;

        await query(
            `INSERT INTO report_versions (report_id, doctor_id, findings, impression, docx_url, pdf_url, version_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, doctorId, findings, impression, files.docxPath, files.pdfPath, nextVersion]
        );

        // Update report with latest PDF URL
        if (files.pdfPath) {
            await query('UPDATE reports SET report_pdf_url = $1 WHERE id = $2', [files.pdfPath, id]);
        }

        res.json({
            message: 'Report saved successfully',
            report: updateResult.rows[0],
            files
        });

    } catch (error) {
        console.error('Save radiology report error:', error);
        res.status(500).json({ error: 'Failed to save radiology report' });
    }
};

const getTemplates = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await query(
            'SELECT * FROM report_templates WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY name',
            [tenantId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

module.exports = {
    getRadiologyReports,
    getReportDetails,
    saveReport,
    getTemplates
};
