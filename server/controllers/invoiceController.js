const { query } = require('../config/db');
const { getAccountingYearInfo } = require('../utils/dateHelper');

/**
 * Generate unique invoice number based on Accounting Year
 */
const generateInvoiceNumber = async (tenantId, branchId) => {
    const fy = getAccountingYearInfo();

    // Get count of invoices for this branch in current financial year
    const result = await query(
        `SELECT COUNT(*) as count FROM invoices 
     WHERE tenant_id = $1 AND branch_id = $2 
     AND created_at >= $3 AND created_at <= $4`,
        [tenantId, branchId, fy.startDate, fy.endDate]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const invoiceNumber = `INV/${fy.label}/${count.toString().padStart(5, '0')}`;

    return invoiceNumber;
};

/**
 * Calculate GST (India compliant)
 */
const calculateGST = (amount, gstPercentage = 0) => {
    const gstAmount = (amount * gstPercentage) / 100;
    return {
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        totalGst: gstAmount,
    };
};

/**
 * Create new invoice (Billing)
 */
const createInvoice = async (req, res) => {
    try {
        const {
            patientId,
            doctorId,
            tests, // Array of { testId, price, gstPercentage }
            discountAmount = 0,
            paymentMode,
            paidAmount = 0,
        } = req.body;

        const tenantId = req.tenantId;
        const branchId = req.user.branchId;

        // Validation
        if (!patientId || !tests || tests.length === 0) {
            return res.status(400).json({ error: 'Patient and tests are required' });
        }

        // Calculate totals
        let totalAmount = 0;
        let totalTax = 0;

        tests.forEach(test => {
            totalAmount += parseFloat(test.price);
            const gst = calculateGST(test.price, test.gstPercentage || 0);
            totalTax += gst.totalGst;
        });

        const netAmount = totalAmount + totalTax - discountAmount;
        const balanceAmount = netAmount - paidAmount;
        const paymentStatus = balanceAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING');

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(tenantId, branchId);

        // Start transaction
        const client = await require('../config/db').pool.connect();

        try {
            await client.query('BEGIN');

            // Create invoice
            const invoiceResult = await client.query(
                `INSERT INTO invoices (
          tenant_id, branch_id, patient_id, doctor_id, invoice_number,
          total_amount, discount_amount, tax_amount, net_amount,
          paid_amount, balance_amount, payment_status, payment_mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
                [
                    tenantId, branchId, patientId, doctorId, invoiceNumber,
                    totalAmount, discountAmount, totalTax, netAmount,
                    paidAmount, balanceAmount, paymentStatus, paymentMode
                ]
            );

            const invoiceId = invoiceResult.rows[0].id;

            // Create invoice items and reports
            for (const test of tests) {
                // Generate a unique sample_id (Barcode) - Format: SID + Date + Random
                const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
                const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const sampleId = test.sampleId || `SID${datePart}${randomPart}`;

                // Insert invoice item
                await client.query(
                    `INSERT INTO invoice_items (invoice_id, test_id, price, gst_percentage)
           VALUES ($1, $2, $3, $4)`,
                    [invoiceId, test.testId, test.price, test.gstPercentage || 0]
                );

                // Create pending report with sample_id
                await client.query(
                    `INSERT INTO reports (invoice_id, test_id, status, sample_id)
           VALUES ($1, $2, 'PENDING', $3)`,
                    [invoiceId, test.testId, sampleId]
                );
            }

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Invoice created successfully',
                invoice: invoiceResult.rows[0],
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
};

/**
 * Get all invoices with filters
 */
const getInvoices = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const {
            page = 1,
            limit = 20,
            status,
            fromDate,
            toDate,
            patientId
        } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
      SELECT i.*, p.name as patient_name, p.uhid, d.name as doctor_name
      FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      LEFT JOIN doctors d ON i.doctor_id = d.id
      WHERE i.tenant_id = $1
    `;
        let params = [tenantId];
        let paramCount = 1;

        // Add filters
        if (status) {
            paramCount++;
            queryText += ` AND i.payment_status = $${paramCount}`;
            params.push(status);
        }

        if (fromDate) {
            paramCount++;
            queryText += ` AND i.created_at >= $${paramCount}`;
            params.push(fromDate);
        }

        if (toDate) {
            paramCount++;
            queryText += ` AND i.created_at <= $${paramCount}`;
            params.push(toDate);
        }

        if (patientId) {
            paramCount++;
            queryText += ` AND i.patient_id = $${paramCount}`;
            params.push(patientId);
        }

        queryText += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        // Get total count
        const countResult = await query(
            'SELECT COUNT(*) FROM invoices WHERE tenant_id = $1',
            [tenantId]
        );

        res.json({
            invoices: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            totalPages: Math.ceil(countResult.rows[0].count / limit),
        });

    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
};

/**
 * Get invoice by ID with items
 */
const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        // Get invoice details
        const invoiceResult = await query(
            `SELECT i.*, p.name as patient_name, p.uhid, p.age, p.gender,
              d.name as doctor_name, d.specialization
       FROM invoices i
       LEFT JOIN patients p ON i.patient_id = p.id
       LEFT JOIN doctors d ON i.doctor_id = d.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
            [id, tenantId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Get invoice items with sample_id from reports
        const itemsResult = await query(
            `SELECT ii.*, t.name as test_name, t.code as test_code, r.sample_id
       FROM invoice_items ii
       LEFT JOIN tests t ON ii.test_id = t.id
       LEFT JOIN reports r ON ii.invoice_id = r.invoice_id AND ii.test_id = r.test_id
       WHERE ii.invoice_id = $1`,
            [id]
        );

        res.json({
            invoice: invoiceResult.rows[0],
            items: itemsResult.rows,
        });

    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
};

/**
 * Update payment
 */
const updatePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { paidAmount, paymentMode } = req.body;
        const tenantId = req.tenantId;

        // Get current invoice
        const invoiceResult = await query(
            'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const invoice = invoiceResult.rows[0];
        const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(paidAmount);
        const newBalanceAmount = parseFloat(invoice.net_amount) - newPaidAmount;
        const newPaymentStatus = newBalanceAmount === 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'PENDING');

        // Update invoice
        const result = await query(
            `UPDATE invoices 
       SET paid_amount = $1, balance_amount = $2, payment_status = $3, payment_mode = $4
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
            [newPaidAmount, newBalanceAmount, newPaymentStatus, paymentMode, id, tenantId]
        );

        res.json({
            message: 'Payment updated successfully',
            invoice: result.rows[0],
        });

    } catch (error) {
        console.error('Update payment error:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
};

/**
 * Download Invoice PDF
 */
const downloadInvoicePDF = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const pdfService = require('../services/pdfService');

        // Get invoice details with patient, doctor, and tenant info
        const invoiceResult = await query(
            `SELECT i.*, p.name as patient_name, p.uhid, p.age, p.gender, p.phone, p.address,
               d.name as doctor_name,
               t.name as lab_name, t.address as lab_address, 
               t.contact_phone as lab_phone, t.contact_email as lab_email, t.gst_number
        FROM invoices i
        JOIN patients p ON i.patient_id = p.id
        LEFT JOIN doctors d ON i.doctor_id = d.id
        JOIN tenants t ON i.tenant_id = t.id
        WHERE i.id = $1 AND i.tenant_id = $2`,
            [id, tenantId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Get invoice items with sample_id
        const itemsResult = await query(
            `SELECT ii.*, t.name as test_name, t.code as test_code, r.sample_id
       FROM invoice_items ii
       LEFT JOIN tests t ON ii.test_id = t.id
       LEFT JOIN reports r ON ii.invoice_id = r.invoice_id AND ii.test_id = r.test_id
       WHERE ii.invoice_id = $1`,
            [id]
        );

        const invoiceData = {
            ...invoiceResult.rows[0],
            items: itemsResult.rows
        };

        // Generate PDF
        const pdfBuffer = await pdfService.generateInvoicePDF(invoiceData);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${invoiceData.invoice_number.replace(/\//g, '_')}.pdf`);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Download Invoice PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
};

module.exports = {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updatePayment,
    downloadInvoicePDF
};
