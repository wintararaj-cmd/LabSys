const { query } = require('../config/db');
const { getAccountingYearInfo } = require('../utils/dateHelper');
const { logAuditEvent } = require('../services/auditService');
const { notifyInvoiceCreated } = require('../services/notificationService');
const { calculateCommission } = require('../services/commissionService');

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
            introducerId,     // FK to doctors — the actual introducer doctor
            introducerRaw,    // Raw string: 'SELF' if patient is self-referred
            department,       // 'MRI' | 'GENERAL' | 'RADIOLOGY' etc.
            tests,
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
        if (doctorId === undefined) {
            return res.status(400).json({ error: 'Referring Doctor is mandatory' });
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

        if (paidAmount < 0) {
            return res.status(400).json({ error: 'Amount Paid cannot be less than 0' });
        }
        if (paidAmount > netAmount) {
            return res.status(400).json({ error: `Amount Paid cannot exceed the Net Amount (₹${netAmount.toFixed(2)})` });
        }

        const balanceAmount = netAmount - paidAmount;
        const paymentStatus = balanceAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'PENDING');

        // Calculate commission
        const commission = await calculateCommission({
            tenantId,
            department: department || 'GENERAL',
            doctorId: doctorId ? parseInt(doctorId) : null,
            introducerId: introducerId ? parseInt(introducerId) : null,
            introducerRaw: introducerRaw || '',
            netAmount
        });

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
          paid_amount, balance_amount, payment_status, payment_mode,
          introducer_id, department, commission_mode, doctor_commission, introducer_commission
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
                [
                    tenantId, branchId, patientId, doctorId, invoiceNumber,
                    totalAmount, discountAmount, totalTax, netAmount,
                    paidAmount, balanceAmount, paymentStatus, paymentMode,
                    commission.introducerId, department || 'GENERAL',
                    commission.mode, commission.doctorCommission, commission.introducerCommission
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

            await logAuditEvent({
                tenantId,
                userId: req.user?.userId,
                action: 'CREATE',
                entityType: 'INVOICE',
                entityId: invoiceId,
                details: `Created invoice ${invoiceNumber} for patient ID ${patientId}`
            });

            // Fire-and-forget notification (non-blocking)
            const patientRes = await query('SELECT name, phone FROM patients WHERE id = $1', [patientId]);
            if (patientRes.rows.length > 0) {
                const { name, phone } = patientRes.rows[0];
                notifyInvoiceCreated(tenantId, {
                    patientName: name, patientPhone: phone,
                    patientId, invoiceId,
                    invoiceNumber,
                    amount: netAmount,
                    balance: balanceAmount
                }).catch(err => console.error('[Notify] invoice created:', err.message));
            }

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
 * Update an existing invoice
 */
const updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const {
            patientId,
            doctorId,
            introducerId,
            introducerRaw,
            department,
            tests,
            discountAmount = 0,
            paymentMode,
            paidAmount,
        } = req.body;

        // Validation
        if (!patientId || !tests || tests.length === 0) {
            return res.status(400).json({ error: 'Patient and tests are required' });
        }
        if (doctorId === undefined) {
            return res.status(400).json({ error: 'Referring Doctor is mandatory' });
        }

        const client = await require('../config/db').pool.connect();

        try {
            await client.query('BEGIN');

            const existingInvoiceRes = await client.query(
                'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
                [id, tenantId]
            );

            if (existingInvoiceRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Invoice not found' });
            }

            const existingInvoice = existingInvoiceRes.rows[0];

            // Calculate totals
            let totalAmount = 0;
            let totalTax = 0;

            tests.forEach(test => {
                totalAmount += parseFloat(test.price);
                const gst = calculateGST(test.price, test.gstPercentage || 0);
                totalTax += gst.totalGst;
            });

            const netAmount = totalAmount + totalTax - discountAmount;

            // Allow preserving old paidAmount if not passed, but frontend usually passes it
            const finalPaidAmount = paidAmount !== undefined ? parseFloat(paidAmount) : parseFloat(existingInvoice.paid_amount);

            if (finalPaidAmount < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Amount Paid cannot be less than 0' });
            }
            if (finalPaidAmount > netAmount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Amount Paid cannot exceed the Net Amount (₹${netAmount.toFixed(2)})` });
            }

            const balanceAmount = netAmount - finalPaidAmount;
            const paymentStatus = balanceAmount <= 0 ? 'PAID' : (finalPaidAmount > 0 ? 'PARTIAL' : 'PENDING');

            // Calculate commission
            const commission = await calculateCommission({
                tenantId,
                department: department || existingInvoice.department,
                doctorId: doctorId ? parseInt(doctorId) : null,
                introducerId: introducerId ? parseInt(introducerId) : null,
                introducerRaw: introducerRaw || '',
                netAmount
            });

            // Update invoice
            const updateRes = await client.query(
                `UPDATE invoices SET
                    patient_id = $1, doctor_id = $2, introducer_id = $3, introducer_raw = $4,
                    department = $5, total_amount = $6, discount_amount = $7,
                    tax_amount = $8, net_amount = $9, paid_amount = $10,
                    balance_amount = $11, payment_status = $12, payment_mode = $13,
                    commission_mode = $14, doctor_commission = $15, introducer_commission = $16
                 WHERE id = $17 AND tenant_id = $18
                 RETURNING *`,
                [
                    patientId, doctorId, commission.introducerId, introducerRaw,
                    department || existingInvoice.department, totalAmount, discountAmount,
                    totalTax, netAmount, finalPaidAmount,
                    balanceAmount, paymentStatus, paymentMode || existingInvoice.payment_mode,
                    commission.mode, commission.doctorCommission, commission.introducerCommission,
                    id, tenantId
                ]
            );

            // Fetch existing items
            const existingItemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
            const existingItems = existingItemsRes.rows;

            const existingTestIds = existingItems.map(item => item.test_id);
            const newTestIds = tests.map(test => test.testId);

            const testsToAdd = tests.filter(t => !existingTestIds.includes(t.testId));
            const testsToRemove = existingTestIds.filter(tId => !newTestIds.includes(tId));
            const testsToUpdate = tests.filter(t => existingTestIds.includes(t.testId));

            // Remove deleted items and their PENDING reports
            if (testsToRemove.length > 0) {
                await client.query('DELETE FROM invoice_items WHERE invoice_id = $1 AND test_id = ANY($2)', [id, testsToRemove]);
                await client.query('DELETE FROM reports WHERE invoice_id = $1 AND test_id = ANY($2) AND status = $3', [id, testsToRemove, 'PENDING']);
            }

            // Update existing items
            for (const test of testsToUpdate) {
                await client.query(
                    `UPDATE invoice_items SET price = $1, gst_percentage = $2
                     WHERE invoice_id = $3 AND test_id = $4`,
                    [test.price, test.gstPercentage || 0, id, test.testId]
                );
            }

            // Add new items
            for (const test of testsToAdd) {
                const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
                const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const sampleId = test.sampleId || `SID${datePart}${randomPart}`;

                await client.query(
                    `INSERT INTO invoice_items (invoice_id, test_id, price, gst_percentage)
                     VALUES ($1, $2, $3, $4)`,
                    [id, test.testId, test.price, test.gstPercentage || 0]
                );

                await client.query(
                    `INSERT INTO reports (invoice_id, test_id, status, sample_id)
                     VALUES ($1, $2, 'PENDING', $3)`,
                    [id, test.testId, sampleId]
                );
            }

            await logAuditEvent({
                tenantId,
                userId: req.user?.userId,
                action: 'UPDATE',
                entityType: 'INVOICE',
                entityId: id,
                details: `Updated invoice ${existingInvoice.invoice_number} for patient ID ${patientId}`
            });

            await client.query('COMMIT');

            res.status(200).json({
                message: 'Invoice updated successfully',
                invoice: updateRes.rows[0],
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({ error: 'Failed to update invoice' });
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
            limit = 50,
            status,
            fromDate,
            toDate,
            date,       // single date shorthand — overrides fromDate/toDate
            patientId,
            mobile      // filter by patient phone number
        } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
      SELECT i.*, p.name as patient_name, p.uhid, p.phone as patient_phone, d.name as doctor_name
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

        if (date) {
            paramCount++;
            queryText += ` AND(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date = $${paramCount}:: date`;
            params.push(date);
        } else {
            if (fromDate) {
                paramCount++;
                queryText += ` AND(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date >= $${paramCount}:: date`;
                params.push(fromDate);
            }

            if (toDate) {
                paramCount++;
                queryText += ` AND(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date <= $${paramCount}:: date`;
                params.push(toDate);
            }
        }

        if (patientId) {
            paramCount++;
            queryText += ` AND i.patient_id = $${paramCount}`;
            params.push(patientId);
        }

        if (mobile) {
            paramCount++;
            queryText += ` AND p.phone ILIKE $${paramCount}`;
            params.push(`% ${mobile} % `);
        }

        queryText += ` ORDER BY i.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2} `;
        params.push(limit, offset);

        const result = await query(queryText, params);

        // Get total count for the current filter
        let countText = `
      SELECT COUNT(*) FROM invoices i
      LEFT JOIN patients p ON i.patient_id = p.id
      WHERE i.tenant_id = $1
            `;
        let countParams = [tenantId];
        let cp = 1;
        if (status) { cp++; countText += ` AND i.payment_status = $${cp} `; countParams.push(status); }
        if (date) { cp++; countText += ` AND(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date = $${cp}:: date`; countParams.push(date); }
        else {
            if (fromDate) { cp++; countText += ` AND(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date >= $${cp}:: date`; countParams.push(fromDate); }
            if (toDate) { cp++; countText += ` AND(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date <= $${cp}:: date`; countParams.push(toDate); }
        }
        if (patientId) { cp++; countText += ` AND i.patient_id = $${cp} `; countParams.push(patientId); }
        if (mobile) { cp++; countText += ` AND p.phone ILIKE $${cp} `; countParams.push(` % ${mobile}% `); }

        const countResult = await query(countText, countParams);

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
 * Get previous day dues (PARTIAL or PENDING invoices from before today)
 */
const getPreviousDayDues = async (req, res) => {
    try {
        const tenantId = req.tenantId;

        const result = await query(
            `SELECT i.*, p.name as patient_name, p.uhid, p.phone as patient_phone, d.name as doctor_name
       FROM invoices i
       LEFT JOIN patients p ON i.patient_id = p.id
       LEFT JOIN doctors d ON i.doctor_id = d.id
       WHERE i.tenant_id = $1
         AND i.payment_status IN('PARTIAL', 'PENDING')
        AND(i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date < (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'):: date
       ORDER BY i.created_at ASC
       LIMIT 100`,
            [tenantId]
        );

        res.json({ dues: result.rows });

    } catch (error) {
        console.error('Get previous day dues error:', error);
        res.status(500).json({ error: 'Failed to fetch previous day dues' });
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

        if (invoice.payment_status === 'REFUNDED') {
            return res.status(400).json({ error: 'Cannot update payment for a fully refunded invoice.' });
        }

        const currentBalance = parseFloat(invoice.balance_amount);
        const parsedPaid = parseFloat(paidAmount) || 0;

        if (parsedPaid < 0) {
            return res.status(400).json({ error: 'Paid amount cannot be less than 0' });
        }
        if (parsedPaid > currentBalance) {
            return res.status(400).json({ error: `Paid amount cannot exceed the Balance Amount(₹${currentBalance.toFixed(2)})` });
        }

        const newPaidAmount = parseFloat(invoice.paid_amount) + parsedPaid;
        const netAfterRefund = parseFloat(invoice.net_amount) - parseFloat(invoice.refund_amount || 0);
        const newBalanceAmount = netAfterRefund - newPaidAmount;

        let newPaymentStatus = 'PENDING';
        if (newBalanceAmount <= 0) {
            newPaymentStatus = 'PAID';
        } else if (newPaidAmount > 0) {
            newPaymentStatus = 'PARTIAL';
        }

        // Update invoice
        const result = await query(
            `UPDATE invoices 
       SET paid_amount = $1, balance_amount = $2, payment_status = $3, payment_mode = $4
       WHERE id = $5 AND tenant_id = $6
        RETURNING * `,
            [newPaidAmount, newBalanceAmount, newPaymentStatus, paymentMode, id, tenantId]
        );

        await logAuditEvent({
            tenantId,
            userId: req.user?.userId,
            action: 'UPDATE',
            entityType: 'INVOICE',
            entityId: id,
            newValues: { paidAmount, paymentMode, newPaymentStatus },
            details: `Updated payment for invoice ID ${id} `
        });

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
 * Process Refund
 */
const processRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const { refundAmount, refundNote } = req.body;
        const tenantId = req.tenantId;

        // Validation
        if (!refundAmount || refundAmount <= 0) {
            return res.status(400).json({ error: 'Valid refund amount is required.' });
        }

        const invoiceResult = await query(
            'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const invoice = invoiceResult.rows[0];

        // Ensure you don't refund more than what is paid
        const currentPaid = parseFloat(invoice.paid_amount);
        const currentRefunded = parseFloat(invoice.refund_amount || 0);

        if (parseFloat(refundAmount) > (currentPaid - currentRefunded)) {
            return res.status(400).json({ error: 'Refund amount cannot exceed the net paid amount.' });
        }

        const newRefundTotal = currentRefunded + parseFloat(refundAmount);
        const netAfterRefund = parseFloat(invoice.net_amount) - newRefundTotal;
        const newBalanceAmount = netAfterRefund - currentPaid;

        let newPaymentStatus = 'REFUNDED'; // Assume full refund cancels it out
        if (newRefundTotal < parseFloat(invoice.net_amount)) {
            // It's a partial refund
            if (newBalanceAmount <= 0) newPaymentStatus = 'PAID';
            else if (currentPaid > 0) newPaymentStatus = 'PARTIAL';
            else newPaymentStatus = 'PENDING';
        }

        const result = await query(
            `UPDATE invoices 
             SET refund_amount = $1, refund_note = $2, balance_amount = $3, payment_status = $4
             WHERE id = $5 AND tenant_id = $6
        RETURNING * `,
            [newRefundTotal, refundNote || '', newBalanceAmount, newPaymentStatus, id, tenantId]
        );

        await logAuditEvent({
            tenantId,
            userId: req.user?.userId,
            action: 'REFUND',
            entityType: 'INVOICE',
            entityId: id,
            newValues: { refundAmount, refundNote, newPaymentStatus },
            details: `Processed refund of ₹${parseFloat(refundAmount).toFixed(2)} for invoice ID ${id}.Note: ${refundNote} `
        });

        res.json({
            message: 'Refund processed successfully',
            invoice: result.rows[0],
        });

    } catch (error) {
        console.error('Process refund error:', error);
        res.status(500).json({ error: 'Failed to process refund' });
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
        res.setHeader('Content-Disposition', `attachment; filename = ${invoiceData.invoice_number.replace(/\//g, '_')}.pdf`);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Download Invoice PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
    }
};

module.exports = {
    createInvoice,
    updateInvoice,
    getInvoices,
    getInvoiceById,
    updatePayment,
    processRefund,
    downloadInvoicePDF,
    getPreviousDayDues
};
