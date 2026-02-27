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
 * Get Double-Column Cash Book Report
 * Returns both INWARD (receipts) and OUTWARD (payments, purchases, payouts) entries
 * split across Cash and Bank columns.
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

        // Date filter for non-created_at columns (purchase_invoices, doctor_payouts)
        let dateFilterPurchase = '';
        let paramsForPurchase = [tenantId];
        let pNum = 1;
        if (startDate) {
            pNum++;
            dateFilterPurchase += ` AND (purchase_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${pNum}::date`;
            paramsForPurchase.push(startDate);
        }
        if (endDate) {
            pNum++;
            dateFilterPurchase += ` AND (purchase_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $${pNum}::date`;
            paramsForPurchase.push(endDate);
        }

        let dateFilterPayout = '';
        let paramsForPayout = [tenantId];
        let poNum = 1;
        if (startDate) {
            poNum++;
            dateFilterPayout += ` AND (payment_date::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${poNum}::date`;
            paramsForPayout.push(startDate);
        }
        if (endDate) {
            poNum++;
            dateFilterPayout += ` AND (payment_date::timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $${poNum}::date`;
            paramsForPayout.push(endDate);
        }

        // ── INWARD: Invoice initial payments ─────────────────────────────
        const inwardSql = `
            WITH subsequent_payments AS (
                SELECT
                    NULLIF(entity_id, '')::int as invoice_id,
                    SUM((new_values->>'paidAmount')::numeric) as total_subsequent
                FROM audit_logs
                WHERE tenant_id = $1 AND entity_type = 'INVOICE'
                  AND action = 'UPDATE' AND entity_id ~ '^[0-9]+$'
                  AND new_values ? 'paidAmount'
                  AND (new_values->>'paidAmount')::numeric > 0
                GROUP BY 1
            )
            SELECT
                i.created_at,
                i.invoice_number as reference,
                p.name as particulars,
                COALESCE(i.payment_mode, 'CASH') as payment_mode,
                CASE WHEN COALESCE(i.payment_mode,'CASH') = 'CASH'
                     THEN GREATEST(i.paid_amount - COALESCE(sp.total_subsequent,0), 0)
                     ELSE 0 END as cash_in,
                CASE WHEN COALESCE(i.payment_mode,'CASH') != 'CASH'
                     THEN GREATEST(i.paid_amount - COALESCE(sp.total_subsequent,0), 0)
                     ELSE 0 END as bank_in,
                0 as cash_out,
                0 as bank_out,
                'INWARD' as type,
                'Patient Receipt' as category
            FROM invoices i
            JOIN patients p ON i.patient_id = p.id
            LEFT JOIN subsequent_payments sp ON i.id = sp.invoice_id
            WHERE i.tenant_id = $1
              AND (i.paid_amount - COALESCE(sp.total_subsequent,0)) > 0
            ${dateFilter.replace(/created_at/g, 'i.created_at')}
        `;

        // ── INWARD: Due payments from audit_logs ─────────────────────────
        const duePaySql = `
            SELECT
                al.created_at,
                i.invoice_number as reference,
                p.name as particulars,
                COALESCE(al.new_values->>'paymentMode','CASH') as payment_mode,
                CASE WHEN COALESCE(al.new_values->>'paymentMode','CASH') = 'CASH'
                     THEN (al.new_values->>'paidAmount')::numeric
                     ELSE 0 END as cash_in,
                CASE WHEN COALESCE(al.new_values->>'paymentMode','CASH') != 'CASH'
                     THEN (al.new_values->>'paidAmount')::numeric
                     ELSE 0 END as bank_in,
                0 as cash_out,
                0 as bank_out,
                'INWARD' as type,
                'Due Collection' as category
            FROM audit_logs al
            JOIN invoices i ON NULLIF(al.entity_id,'')::int = i.id
            JOIN patients p ON i.patient_id = p.id
            WHERE al.tenant_id = $1
              AND al.entity_type = 'INVOICE' AND al.action = 'UPDATE'
              AND al.entity_id ~ '^[0-9]+$'
              AND al.new_values ? 'paidAmount'
              AND (al.new_values->>'paidAmount')::numeric > 0
            ${dateFilter.replace(/created_at/g, 'al.created_at')}
        `;

        // ── OUTWARD: Doctor Payouts ───────────────────────────────────────
        const payoutSql = `
            SELECT
                dp.created_at,
                COALESCE(dp.reference_number, 'PAYOUT') as reference,
                d.name as particulars,
                COALESCE(dp.payment_mode, 'CASH') as payment_mode,
                0 as cash_in,
                0 as bank_in,
                CASE WHEN COALESCE(dp.payment_mode,'CASH') = 'CASH'
                     THEN dp.amount ELSE 0 END as cash_out,
                CASE WHEN COALESCE(dp.payment_mode,'CASH') != 'CASH'
                     THEN dp.amount ELSE 0 END as bank_out,
                'OUTWARD' as type,
                'Doctor Payout' as category
            FROM doctor_payouts dp
            JOIN doctors d ON dp.doctor_id = d.id
            WHERE dp.tenant_id = $1
            ${dateFilterPayout}
        `;

        // ── OUTWARD: Purchase Invoices ────────────────────────────────────
        const purchaseSql = `
            SELECT
                pi.created_at,
                pi.invoice_number as reference,
                pi.supplier_name as particulars,
                COALESCE(pi.payment_mode, 'CASH') as payment_mode,
                0 as cash_in,
                0 as bank_in,
                CASE WHEN COALESCE(pi.payment_mode,'CASH') = 'CASH'
                     THEN pi.total_amount ELSE 0 END as cash_out,
                CASE WHEN COALESCE(pi.payment_mode,'CASH') != 'CASH'
                     THEN pi.total_amount ELSE 0 END as bank_out,
                'OUTWARD' as type,
                'Purchase' as category
            FROM purchase_invoices pi
            WHERE pi.tenant_id = $1
              AND pi.payment_status IN ('PAID','PARTIAL')
            ${dateFilterPurchase}
        `;

        const [inwardRes, dueRes, payoutRes, purchaseRes] = await Promise.allSettled([
            query(inwardSql, params),
            query(duePaySql, params),
            query(payoutSql, paramsForPayout),
            query(purchaseSql, paramsForPurchase),
        ]);

        let rows = [
            ...(inwardRes.status === 'fulfilled' ? inwardRes.value.rows : []),
            ...(dueRes.status === 'fulfilled' ? dueRes.value.rows : []),
            ...(payoutRes.status === 'fulfilled' ? payoutRes.value.rows : []),
            ...(purchaseRes.status === 'fulfilled' ? purchaseRes.value.rows : []),
        ];

        // Apply payment mode filter at application level if specified
        if (paymentMode && paymentMode !== 'ALL') {
            rows = rows.filter(r => r.payment_mode === paymentMode);
        }

        // Sort chronologically
        rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Compute running balances
        let runningCash = 0;
        let runningBank = 0;
        rows = rows.map(r => {
            const cashIn = parseFloat(r.cash_in) || 0;
            const bankIn = parseFloat(r.bank_in) || 0;
            const cashOut = parseFloat(r.cash_out) || 0;
            const bankOut = parseFloat(r.bank_out) || 0;
            runningCash += cashIn - cashOut;
            runningBank += bankIn - bankOut;
            return { ...r, cash_in: cashIn, bank_in: bankIn, cash_out: cashOut, bank_out: bankOut, running_cash: runningCash, running_bank: runningBank };
        });

        const totalCashIn = rows.reduce((s, r) => s + r.cash_in, 0);
        const totalBankIn = rows.reduce((s, r) => s + r.bank_in, 0);
        const totalCashOut = rows.reduce((s, r) => s + r.cash_out, 0);
        const totalBankOut = rows.reduce((s, r) => s + r.bank_out, 0);

        res.json({
            data: rows,
            summary: {
                totalCashIn, totalBankIn,
                totalCashOut, totalBankOut,
                closingCash: totalCashIn - totalCashOut,
                closingBank: totalBankIn - totalBankOut,
            }
        });

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
