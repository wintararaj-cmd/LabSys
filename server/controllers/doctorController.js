const { query } = require('../config/db');

/**
 * Get all doctors (enriched with referral stats)
 */
const getDoctors = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { search } = req.query;

        let whereClause = 'd.tenant_id = $1 AND d.is_introducer = FALSE';
        let params = [tenantId];

        if (search) {
            whereClause += ' AND (d.name ILIKE $2 OR d.specialization ILIKE $2)';
            params.push(`%${search}%`);
        }

        const result = await query(
            `SELECT d.*,
                COUNT(DISTINCT i.id)                          AS referral_count,
                COALESCE(SUM(i.doctor_commission), 0)         AS total_commission_earned,
                COALESCE(SUM(i.net_amount), 0)                AS total_business,
                COALESCE((
                    SELECT SUM(p.amount)
                    FROM doctor_payouts p
                    WHERE p.doctor_id = d.id AND p.tenant_id = d.tenant_id
                ), 0)                                         AS total_commission_paid
             FROM doctors d
             LEFT JOIN invoices i ON i.doctor_id = d.id AND i.tenant_id = d.tenant_id
             WHERE ${whereClause}
             GROUP BY d.id
             ORDER BY d.name`,
            params
        );

        res.json({ doctors: result.rows });

    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
};

/**
 * Add new doctor
 */
const addDoctor = async (req, res) => {
    try {
        const { name, specialization, phone, email, commissionPercentage } = req.body;
        const tenantId = req.tenantId;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = await query(
            `INSERT INTO doctors (tenant_id, name, specialization, phone, email, commission_percentage)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [tenantId, name, specialization, phone, email, commissionPercentage || 0]
        );

        res.status(201).json({
            message: 'Doctor added successfully',
            doctor: result.rows[0],
        });

    } catch (error) {
        console.error('Add doctor error:', error);
        res.status(500).json({ error: 'Failed to add doctor' });
    }
};

/**
 * Update doctor
 */
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, specialization, phone, email, commissionPercentage } = req.body;
        const tenantId = req.tenantId;

        const result = await query(
            `UPDATE doctors SET
        name = COALESCE($1, name),
        specialization = COALESCE($2, specialization),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        commission_percentage = COALESCE($5, commission_percentage)
       WHERE id = $6 AND tenant_id = $7
       RETURNING *`,
            [name, specialization, phone, email, commissionPercentage, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json({
            message: 'Doctor updated successfully',
            doctor: result.rows[0],
        });

    } catch (error) {
        console.error('Update doctor error:', error);
        res.status(500).json({ error: 'Failed to update doctor' });
    }
};

/**
 * Get doctor commission report
 */
const getDoctorCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const { fromDate, toDate } = req.query;
        const tenantId = req.tenantId;

        const result = await query(
            `SELECT 
        d.name, d.specialization, d.commission_percentage,
        COUNT(i.id) as total_referrals,
        SUM(i.net_amount) as total_business,
        SUM(i.net_amount * d.commission_percentage / 100) as total_commission
       FROM doctors d
       LEFT JOIN invoices i ON d.id = i.doctor_id 
         AND (i.created_at AT TIME ZONE 'Asia/Kolkata')::date >= $1::date AND (i.created_at AT TIME ZONE 'Asia/Kolkata')::date <= $2::date
       WHERE d.id = $3 AND d.tenant_id = $4
       GROUP BY d.id, d.name, d.specialization, d.commission_percentage`,
            [fromDate, toDate, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json({ commission: result.rows[0] });

    } catch (error) {
        console.error('Get doctor commission error:', error);
        res.status(500).json({ error: 'Failed to fetch commission report' });
    }
};



/**
 * Get Outstanding Commission (uses stored doctor_commission column)
 * Correctly reflects SPLIT invoices — bug fix from old recalculation formula
 */
const getOutstandingCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        // 1. Totals from stored column (correct after splits)
        const earnedResult = await query(
            `SELECT
                COALESCE(SUM(i.doctor_commission), 0)        AS total_earned,
                COUNT(i.id)                                  AS total_invoices,
                COALESCE(SUM(i.net_amount), 0)               AS total_business,
                COALESCE(SUM(i.introducer_commission), 0)    AS total_given_to_intro,
                SUM(CASE WHEN i.commission_mode = 'DOCTOR'      THEN 1 ELSE 0 END) AS mode_doctor,
                SUM(CASE WHEN i.commission_mode = 'INTRODUCER'  THEN 1 ELSE 0 END) AS mode_introducer,
                SUM(CASE WHEN i.commission_mode = 'SPLIT'       THEN 1 ELSE 0 END) AS mode_split
             FROM invoices i
             WHERE i.doctor_id = $1 AND i.tenant_id = $2`,
            [id, tenantId]
        );

        // 2. Total paid out
        const paidResult = await query(
            `SELECT COALESCE(SUM(amount), 0) AS total_paid
             FROM doctor_payouts
             WHERE doctor_id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        // 3. Monthly breakdown — last 6 months
        const monthlyResult = await query(
            `SELECT
                TO_CHAR(i.created_at, 'Mon YYYY')           AS month,
                COUNT(i.id)                                  AS invoices,
                COALESCE(SUM(i.doctor_commission), 0)        AS commission,
                COALESCE(SUM(i.net_amount), 0)               AS business,
                DATE_TRUNC('month', i.created_at)            AS month_date
             FROM invoices i
             WHERE i.doctor_id = $1 AND i.tenant_id = $2
               AND i.created_at >= CURRENT_DATE - INTERVAL '6 months'
             GROUP BY TO_CHAR(i.created_at, 'Mon YYYY'), DATE_TRUNC('month', i.created_at)
             ORDER BY month_date DESC`,
            [id, tenantId]
        );

        // 4. Recent invoice breakdown — last 20
        const breakdownResult = await query(
            `SELECT
                i.id, i.invoice_number, i.created_at,
                i.net_amount, i.commission_mode,
                i.doctor_commission, i.introducer_commission,
                d2.name AS introducer_name
             FROM invoices i
             LEFT JOIN doctors d2 ON d2.id = i.introducer_id
             WHERE i.doctor_id = $1 AND i.tenant_id = $2
             ORDER BY i.created_at DESC
             LIMIT 20`,
            [id, tenantId]
        );

        const row = earnedResult.rows[0];
        const totalEarned = parseFloat(row.total_earned);
        const totalPaid = parseFloat(paidResult.rows[0].total_paid);

        res.json({
            doctor_id: id,
            total_earned: totalEarned,
            total_paid: totalPaid,
            outstanding_amount: totalEarned - totalPaid,
            total_invoices: parseInt(row.total_invoices),
            total_business: parseFloat(row.total_business),
            total_given_to_intro: parseFloat(row.total_given_to_intro),
            mode_counts: {
                DOCTOR: parseInt(row.mode_doctor),
                INTRODUCER: parseInt(row.mode_introducer),
                SPLIT: parseInt(row.mode_split),
            },
            monthly: monthlyResult.rows,
            breakdown: breakdownResult.rows,
        });

    } catch (error) {
        console.error('Get outstanding commission error:', error);
        res.status(500).json({ error: 'Failed to fetch outstanding commission' });
    }
};

/**
 * Create Doctor Payout
 */
const createPayout = async (req, res) => {
    try {
        const { id } = req.params; // doctor_id
        const { amount, paymentMode, referenceNumber, notes, paymentDate } = req.body;
        const tenantId = req.tenantId;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const result = await query(
            `INSERT INTO doctor_payouts 
             (tenant_id, doctor_id, amount, payment_mode, reference_number, notes, payment_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [tenantId, id, amount, paymentMode, referenceNumber, notes, paymentDate || new Date()]
        );

        res.status(201).json({
            message: 'Payout recorded successfully',
            payout: result.rows[0]
        });

    } catch (error) {
        console.error('Create payout error:', error);
        res.status(500).json({ error: 'Failed to create payout' });
    }
};

/**
 * Get Payout History
 */
const getPayoutHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const result = await query(
            `SELECT * FROM doctor_payouts 
             WHERE doctor_id = $1 AND tenant_id = $2 
             ORDER BY payment_date DESC, created_at DESC`,
            [id, tenantId]
        );

        res.json({ payouts: result.rows });

    } catch (error) {
        console.error('Get payout history error:', error);
        res.status(500).json({ error: 'Failed to fetch payout history' });
    }
};

/**
 * Get all Introducers (doctors with is_introducer = true)
 */
const getIntroducers = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { search } = req.query;

        let queryText = `
            SELECT d.*,
                COUNT(DISTINCT i.id)                          AS referral_count,
                COALESCE(SUM(i.introducer_commission), 0)     AS total_commission_earned,
                COALESCE((
                    SELECT SUM(p.amount)
                    FROM doctor_payouts p
                    WHERE p.doctor_id = d.id AND p.tenant_id = d.tenant_id
                ), 0)                                         AS total_commission_paid
            FROM doctors d
            LEFT JOIN invoices i ON i.introducer_id = d.id AND i.tenant_id = d.tenant_id
            WHERE d.tenant_id = $1 AND d.is_introducer = TRUE
        `;
        let params = [tenantId];

        if (search) {
            queryText += ' AND (d.name ILIKE $2 OR d.specialization ILIKE $2 OR d.phone ILIKE $2)';
            params.push(`%${search}%`);
        }

        queryText += ' GROUP BY d.id ORDER BY d.name';

        const result = await query(queryText, params);
        res.json({ introducers: result.rows });
    } catch (error) {
        console.error('Get introducers error:', error);
        res.status(500).json({ error: 'Failed to fetch introducers' });
    }
};

/**
 * Add new Introducer
 */
const addIntroducer = async (req, res) => {
    try {
        const { name, specialization, phone, email, commissionPercentage, address } = req.body;
        const tenantId = req.tenantId;

        if (!name) return res.status(400).json({ error: 'Name is required' });

        const result = await query(
            `INSERT INTO doctors (tenant_id, name, specialization, phone, email, commission_percentage, is_introducer)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)
             RETURNING *`,
            [tenantId, name, specialization, phone, email, commissionPercentage || 0]
        );

        res.status(201).json({ message: 'Introducer added', doctor: result.rows[0] });
    } catch (error) {
        console.error('Add introducer error:', error);
        res.status(500).json({ error: 'Failed to add introducer' });
    }
};

/**
 * Update Introducer
 */
const updateIntroducer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, specialization, phone, email, commissionPercentage } = req.body;
        const tenantId = req.tenantId;

        const result = await query(
            `UPDATE doctors SET
                name = COALESCE($1, name),
                specialization = COALESCE($2, specialization),
                phone = COALESCE($3, phone),
                email = COALESCE($4, email),
                commission_percentage = COALESCE($5, commission_percentage)
             WHERE id = $6 AND tenant_id = $7 AND is_introducer = TRUE
             RETURNING *`,
            [name, specialization, phone, email, commissionPercentage, id, tenantId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Introducer not found' });
        res.json({ message: 'Introducer updated', doctor: result.rows[0] });
    } catch (error) {
        console.error('Update introducer error:', error);
        res.status(500).json({ error: 'Failed to update introducer' });
    }
};

/**
 * Get Introducer Outstanding Commission (uses introducer_commission column)
 */
const getIntroducerOutstanding = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const earnedResult = await query(
            `SELECT
                COALESCE(SUM(i.introducer_commission), 0)  AS total_earned,
                COUNT(i.id)                               AS total_invoices,
                COALESCE(SUM(i.net_amount), 0)            AS total_business
             FROM invoices i
             WHERE i.introducer_id = $1 AND i.tenant_id = $2`,
            [id, tenantId]
        );

        const paidResult = await query(
            `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM doctor_payouts
             WHERE doctor_id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        // Monthly breakdown (last 6 months)
        const monthlyResult = await query(
            `SELECT
                TO_CHAR(i.created_at, 'Mon YYYY')           AS month,
                COUNT(i.id)                                  AS invoices,
                COALESCE(SUM(i.introducer_commission), 0)    AS commission,
                DATE_TRUNC('month', i.created_at)            AS month_date
             FROM invoices i
             WHERE i.introducer_id = $1 AND i.tenant_id = $2
               AND i.created_at >= CURRENT_DATE - INTERVAL '6 months'
             GROUP BY TO_CHAR(i.created_at, 'Mon YYYY'), DATE_TRUNC('month', i.created_at)
             ORDER BY month_date DESC`,
            [id, tenantId]
        );

        const totalEarned = parseFloat(earnedResult.rows[0].total_earned);
        const totalPaid = parseFloat(paidResult.rows[0].total_paid);

        res.json({
            total_earned: totalEarned,
            total_paid: totalPaid,
            outstanding_amount: totalEarned - totalPaid,
            total_invoices: parseInt(earnedResult.rows[0].total_invoices),
            total_business: parseFloat(earnedResult.rows[0].total_business),
            monthly: monthlyResult.rows
        });
    } catch (error) {
        console.error('Get introducer outstanding error:', error);
        res.status(500).json({ error: 'Failed to fetch introducer commission' });
    }
};

module.exports = {
    getDoctors,
    addDoctor,
    updateDoctor,
    getDoctorCommission,
    getOutstandingCommission,
    createPayout,
    getPayoutHistory,
    // Introducers
    getIntroducers,
    addIntroducer,
    updateIntroducer,
    getIntroducerOutstanding,
};
