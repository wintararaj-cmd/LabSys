const { query } = require('../config/db');

/**
 * Get all reports with optional filtering
 */
const getAllReports = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { status, search } = req.query;

        // Grouping by invoice to show patient-wise reports
        let queryText = `
            SELECT i.id as invoice_id, i.invoice_number, i.created_at, i.payment_status,
                   p.name as patient_name, p.uhid as patient_uhid, p.age, p.gender,
                   COUNT(r.id) as test_count,
                   array_agg(r.status) as report_statuses,
                   array_agg(r.sample_id) as sample_ids
            FROM invoices i
            JOIN patients p ON i.patient_id = p.id
            LEFT JOIN reports r ON i.id = r.invoice_id
            WHERE i.tenant_id = $1
        `;

        const params = [tenantId];
        let paramCount = 1;

        // Status filter (logic needs to check if any report has that status)
        if (status && status !== 'ALL') {
            paramCount++;
            queryText += ` AND r.status = $${paramCount}`;
            params.push(status);
        }

        // Search filter
        if (search) {
            paramCount++;
            queryText += ` AND (
                LOWER(p.name) LIKE $${paramCount} OR 
                LOWER(p.uhid) LIKE $${paramCount} OR 
                LOWER(i.invoice_number) LIKE $${paramCount} OR
                LOWER(r.sample_id) LIKE $${paramCount}
            )`;
            params.push(`%${search.toLowerCase()}%`);
        }

        queryText += ` 
            GROUP BY i.id, p.id 
            ORDER BY i.created_at DESC
        `;

        const result = await query(queryText, params);

        // Normalize data for frontend
        const reports = result.rows.map(row => {
            const statuses = Array.isArray(row.report_statuses) ? row.report_statuses.filter(s => s !== null) : [];
            const sampleIds = Array.isArray(row.sample_ids) ? row.sample_ids.filter(s => s !== null) : [];

            return {
                ...row,
                id: row.invoice_id,
                sample_id: sampleIds.length > 0 ? sampleIds[0] : '-',
                status: statuses.includes('PENDING') ? 'PENDING' :
                    (statuses.includes('COMPLETED') ? 'COMPLETED' :
                        (statuses.length > 0 ? 'VERIFIED' : 'PENDING'))
            };
        });

        res.json({ reports });

    } catch (error) {
        console.error('Get all reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

/**
 * Get pending reports
 */
const getPendingReports = async (req, res) => {
    try {
        const tenantId = req.tenantId;

        const result = await query(
            `SELECT r.*, t.name as test_name, t.code as test_code,
              p.name as patient_name, p.uhid, p.age, p.gender,
              i.invoice_number, i.created_at as sample_date
       FROM reports r
       JOIN tests t ON r.test_id = t.id
       JOIN invoices i ON r.invoice_id = i.id
       JOIN patients p ON i.patient_id = p.id
       WHERE i.tenant_id = $1 AND r.status IN ('PENDING', 'COMPLETED')
       ORDER BY i.created_at ASC`,
            [tenantId]
        );

        res.json({ reports: result.rows });

    } catch (error) {
        console.error('Get pending reports error:', error);
        res.status(500).json({ error: 'Failed to fetch pending reports' });
    }
};

/**
 * Update test result (Technician entry)
 */
const updateTestResult = async (req, res) => {
    try {
        const { id } = req.params;
        const { resultValue, comments } = req.body;
        const technicianId = req.user.userId;
        const tenantId = req.tenantId;

        // Get test details to check normal range
        const reportResult = await query(
            `SELECT r.*, t.normal_range_male, t.normal_range_female, i.patient_id
       FROM reports r
       JOIN tests t ON r.test_id = t.id
       JOIN invoices i ON r.invoice_id = i.id
       WHERE r.id = $1 AND i.tenant_id = $2`,
            [id, tenantId]
        );

        if (reportResult.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reportResult.rows[0];

        // Get patient gender to determine normal range
        const patientResult = await query(
            'SELECT gender FROM patients WHERE id = $1',
            [report.patient_id]
        );

        const gender = patientResult.rows[0].gender;
        const normalRange = gender === 'Male' ? report.normal_range_male : report.normal_range_female;

        // Check if result is abnormal (simplified logic - can be enhanced)
        let isAbnormal = false;
        if (normalRange && resultValue) {
            // Parse normal range (e.g., "10-20" or "<10" or ">100")
            const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
            if (rangeMatch) {
                const min = parseFloat(rangeMatch[1]);
                const max = parseFloat(rangeMatch[2]);
                const value = parseFloat(resultValue);
                if (!isNaN(value)) {
                    isAbnormal = value < min || value > max;
                }
            }
        }

        // Update report
        const result = await query(
            `UPDATE reports 
       SET result_value = $1, 
           is_abnormal = $2, 
           technician_id = $3, 
           status = 'COMPLETED',
           comments = $4
       WHERE id = $5
       RETURNING *`,
            [resultValue, isAbnormal, technicianId, comments, id]
        );

        res.json({
            message: 'Test result updated successfully',
            report: result.rows[0],
        });

    } catch (error) {
        console.error('Update test result error:', error);
        res.status(500).json({ error: 'Failed to update test result' });
    }
};

/**
 * Verify report (Pathologist verification)
 */
const verifyReport = async (req, res) => {
    try {
        const { id } = req.params;
        const pathologistId = req.user.userId;
        const tenantId = req.tenantId;

        const result = await query(
            `UPDATE reports r
       SET status = 'VERIFIED', 
           pathologist_id = $1, 
           verified_at = CURRENT_TIMESTAMP
       FROM invoices i
       WHERE r.invoice_id = i.id 
       AND r.id = $2 
       AND i.tenant_id = $3
       RETURNING r.*`,
            [pathologistId, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json({
            message: 'Report verified successfully',
            report: result.rows[0],
        });

    } catch (error) {
        console.error('Verify report error:', error);
        res.status(500).json({ error: 'Failed to verify report' });
    }
};

/**
 * Get reports by invoice ID
 */
const getReportsByInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const tenantId = req.tenantId;

        // Verify invoice belongs to tenant
        const invoiceResult = await query(
            'SELECT id FROM invoices WHERE id = $1 AND tenant_id = $2',
            [invoiceId, tenantId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const result = await query(
            `SELECT r.*, t.name as test_name, t.code as test_code, 
              t.normal_range_male, t.normal_range_female, t.unit,
              u1.name as technician_name, u2.name as pathologist_name
       FROM reports r
       JOIN tests t ON r.test_id = t.id
       LEFT JOIN users u1 ON r.technician_id = u1.id
       LEFT JOIN users u2 ON r.pathologist_id = u2.id
       WHERE r.invoice_id = $1
       ORDER BY r.id`,
            [invoiceId]
        );

        res.json({ reports: result.rows });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

/**
 * Get single report by ID with full details
 */
const getReportById = async (req, res) => {
    try {
        const { id } = req.params; // In bulk context, this is invoice_id
        const tenantId = req.tenantId;

        const invoiceResult = await query(
            `SELECT i.*, p.name as patient_name, p.uhid as patient_uhid, p.age, p.gender
             FROM invoices i
             JOIN patients p ON i.patient_id = p.id
             WHERE i.id = $1 AND i.tenant_id = $2`,
            [id, tenantId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const reportsResult = await query(
            `SELECT r.*, t.name as test_name, t.code as test_code, 
                   t.normal_range_male, t.normal_range_female, t.unit
            FROM reports r
            JOIN tests t ON r.test_id = t.id
            WHERE r.invoice_id = $1`,
            [id]
        );

        res.json({
            report: {
                ...invoiceResult.rows[0],
                sample_id: reportsResult.rows.length > 0 ? reportsResult.rows[0].sample_id : '-',
                tests: reportsResult.rows
            }
        });

    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Failed to fetch report details' });
    }
};

/**
 * Update Multiple Results for an Invoice (Manual Entry)
 */
const updateReportResults = async (req, res) => {
    try {
        const { id } = req.params; // Invoice ID
        const { results } = req.body; // Array of { test_id, result_value, remarks }
        const technicianId = req.user.userId;
        const tenantId = req.tenantId;

        for (const item of results) {
            // Get test details for normal range
            const testDetails = await query(
                `SELECT t.normal_range_male, t.normal_range_female, p.gender
                 FROM reports r
                 JOIN tests t ON r.test_id = t.id
                 JOIN invoices i ON r.invoice_id = i.id
                 JOIN patients p ON i.patient_id = p.id
                 WHERE r.invoice_id = $1 AND r.test_id = $2 AND i.tenant_id = $3`,
                [id, item.test_id, tenantId]
            );

            if (testDetails.rows.length > 0) {
                const { normal_range_male, normal_range_female, gender } = testDetails.rows[0];
                const normalRange = gender === 'Male' ? normal_range_male : normal_range_female;

                let isAbnormal = false;
                if (normalRange && item.result_value) {
                    const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
                    if (rangeMatch) {
                        const min = parseFloat(rangeMatch[1]);
                        const max = parseFloat(rangeMatch[2]);
                        const val = parseFloat(item.result_value);
                        if (!isNaN(val)) {
                            isAbnormal = val < min || val > max;
                        }
                    }
                }

                await query(
                    `UPDATE reports 
                     SET result_value = $1, 
                         is_abnormal = $2, 
                         comments = $3,
                         technician_id = $4,
                         status = 'COMPLETED'
                     WHERE invoice_id = $5 AND test_id = $6`,
                    [item.result_value, isAbnormal, item.remarks, technicianId, id, item.test_id]
                );
            }
        }

        res.json({ message: 'Results saved successfully' });

    } catch (error) {
        console.error('Update results error:', error);
        res.status(500).json({ error: 'Failed to save results' });
    }
};

/**
 * Download report as PDF
 */
const downloadReportPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const pdfService = require('../services/pdfService');

        // Get report details with all related information
        const result = await query(
            `SELECT r.*, t.name as test_name, t.code as test_code, 
                   t.normal_range_male, t.normal_range_female, t.unit,
                   p.name as patient_name, p.uhid, p.age, p.gender, p.phone,
                   i.invoice_number, i.created_at as sample_date, i.total_amount,
                   u1.name as technician_name, u2.name as pathologist_name,
                   ten.name as lab_name, ten.address as lab_address, 
                   ten.contact_phone as lab_phone, ten.contact_email as lab_email
            FROM reports r
            JOIN tests t ON r.test_id = t.id
            JOIN invoices i ON r.invoice_id = i.id
            JOIN patients p ON i.patient_id = p.id
            JOIN tenants ten ON i.tenant_id = ten.id
            LEFT JOIN users u1 ON r.technician_id = u1.id
            LEFT JOIN users u2 ON r.pathologist_id = u2.id
            WHERE r.id = $1 AND i.tenant_id = $2 AND r.status = 'VERIFIED'`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Verified report not found' });
        }

        const reportData = result.rows[0];

        // Generate PDF
        const pdfBuffer = await pdfService.generateReportPDFFromData(reportData);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Report_${reportData.invoice_number}_${reportData.test_code}.pdf`);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Download PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
}

module.exports = {
    getAllReports,
    getPendingReports,
    updateTestResult,
    updateReportResults,
    verifyReport,
    getReportsByInvoice,
    getReportById,
    downloadReportPDF,
};
