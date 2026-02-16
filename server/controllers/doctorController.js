const { query } = require('../config/db');

/**
 * Get all doctors
 */
const getDoctors = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { search } = req.query;

        let queryText = 'SELECT * FROM doctors WHERE tenant_id = $1';
        let params = [tenantId];

        if (search) {
            queryText += ' AND (name ILIKE $2 OR specialization ILIKE $2)';
            params.push(`%${search}%`);
        }

        queryText += ' ORDER BY name';

        const result = await query(queryText, params);

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
         AND i.created_at >= $1 AND i.created_at <= $2
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
 * Get Outstanding Commission
 */
const getOutstandingCommission = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        // 1. Calculate Total Earned Commission
        const earnedResult = await query(
            `SELECT COALESCE(SUM(i.net_amount * d.commission_percentage / 100), 0) as total_earned
             FROM doctors d
             LEFT JOIN invoices i ON d.id = i.doctor_id 
             WHERE d.id = $1 AND d.tenant_id = $2`,
            [id, tenantId]
        );

        // 2. Calculate Total Paid Commission
        const paidResult = await query(
            `SELECT COALESCE(SUM(amount), 0) as total_paid
             FROM doctor_payouts
             WHERE doctor_id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        const totalEarned = parseFloat(earnedResult.rows[0].total_earned);
        const totalPaid = parseFloat(paidResult.rows[0].total_paid);
        const outstanding = totalEarned - totalPaid;

        res.json({
            doctor_id: id,
            total_earned: totalEarned,
            total_paid: totalPaid,
            outstanding_amount: outstanding
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

module.exports = {
    getDoctors,
    addDoctor,
    updateDoctor,
    getDoctorCommission,
    getOutstandingCommission,
    createPayout,
    getPayoutHistory
};
