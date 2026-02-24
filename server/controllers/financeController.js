const { query } = require('../config/db');

/**
 * Get GST Report
 */
const getGSTReport = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { startDate, endDate } = req.query;

        let queryText = `
            SELECT i.created_at::DATE as date, i.invoice_number, p.name as patient_name,
                   i.total_amount - i.tax_amount as taxable_amount,
                   i.tax_amount, i.total_amount,
                   array_agg(it.gst_percentage) as gst_percentages
            FROM invoices i
            JOIN patients p ON i.patient_id = p.id
            LEFT JOIN invoice_items it ON i.id = it.invoice_id
            WHERE i.tenant_id = $1
        `;

        const params = [tenantId];
        let paramCount = 1;

        if (startDate) {
            paramCount++;
            queryText += ` AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${paramCount}::date`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            queryText += ` AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $${paramCount}::date`;
            params.push(endDate);
        }

        queryText += ` 
            GROUP BY i.id, p.id
            ORDER BY i.created_at DESC
        `;

        const result = await query(queryText, params);
        res.json({ data: result.rows });

    } catch (error) {
        console.error('GST Report error:', error);
        res.status(500).json({ error: 'Failed to fetch GST report' });
    }
};

/**
 * Get Cash Book Report
 */
const getCashBook = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { startDate, endDate, paymentMode } = req.query;

        let params = [tenantId];
        let paramNum = 1;

        let dateFilter = '';
        if (startDate) {
            paramNum++;
            dateFilter += ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${paramNum}::date`;
            params.push(startDate);
        }

        if (endDate) {
            paramNum++;
            dateFilter += ` AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $${paramNum}::date`;
            params.push(endDate);
        }

        let modeFilter = '';
        if (paymentMode && paymentMode !== 'ALL') {
            paramNum++;
            modeFilter += ` AND payment_mode = $${paramNum}`;
            params.push(paymentMode);
        }

        const queryText = `
            WITH combined_cash AS (
                -- 1. Patient Invoices (INWARD)
                SELECT 
                    i.created_at, 
                    i.invoice_number as reference,
                    i.invoice_number as invoice_number,
                    p.name as particulars,
                    p.name as patient_name,
                    COALESCE(i.payment_mode, 'CASH') as payment_mode, 
                    i.paid_amount as amount,
                    'INWARD' as type,
                    'Patient Payment' as source
                FROM invoices i
                JOIN patients p ON i.patient_id = p.id
                WHERE i.tenant_id = $1 AND COALESCE(i.paid_amount, 0) > 0
            )
            SELECT * FROM combined_cash
            WHERE 1=1
            ${dateFilter}
            ${modeFilter}
            ORDER BY created_at DESC
        `;

        const result = await query(queryText, params);
        res.json({ data: result.rows });

    } catch (error) {
        console.error('Cash Book error:', error);
        res.status(500).json({ error: 'Failed to fetch cash book' });
    }
};

/**
 * Get Sale Report
 */
const getSaleReport = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { startDate, endDate, doctorId, paymentStatus } = req.query;

        let queryText = `
            SELECT i.*, p.name as patient_name, d.name as doctor_name
            FROM invoices i
            JOIN patients p ON i.patient_id = p.id
            LEFT JOIN doctors d ON i.doctor_id = d.id
            WHERE i.tenant_id = $1
        `;

        const params = [tenantId];
        let paramCount = 1;

        if (startDate) {
            paramCount++;
            queryText += ` AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${paramCount}::date`;
            params.push(startDate);
        }

        if (endDate) {
            paramCount++;
            queryText += ` AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $${paramCount}::date`;
            params.push(endDate);
        }

        if (doctorId) {
            paramCount++;
            queryText += ` AND i.doctor_id = $${paramCount}`;
            params.push(doctorId);
        }

        if (paymentStatus && paymentStatus !== 'ALL') {
            paramCount++;
            queryText += ` AND i.payment_status = $${paramCount}`;
            params.push(paymentStatus);
        }

        queryText += ` ORDER BY i.created_at DESC`;

        const result = await query(queryText, params);
        res.json({ data: result.rows });

    } catch (error) {
        console.error('Sale Report error:', error);
        res.status(500).json({ error: 'Failed to fetch sale report' });
    }
};

module.exports = {
    getGSTReport,
    getCashBook,
    getSaleReport
};
