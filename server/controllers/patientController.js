const { query } = require('../config/db');

/**
 * Generate unique UHID (Unique Health ID)
 */
const generateUHID = async (tenantId) => {
    const prefix = 'PAT';
    const year = new Date().getFullYear().toString().slice(-2);

    // Get count of patients for this tenant
    const result = await query(
        'SELECT COUNT(*) as count FROM patients WHERE tenant_id = $1',
        [tenantId]
    );

    const count = parseInt(result.rows[0].count) + 1;
    const uhid = `${prefix}${year}${count.toString().padStart(5, '0')}`;

    return uhid;
};

/**
 * Register a new patient
 */
const registerPatient = async (req, res) => {
    try {
        const { name, age, gender, phone, address } = req.body;
        const tenantId = req.tenantId; // From tenantGuard middleware

        // Validation
        if (!name || !age || !gender) {
            return res.status(400).json({ error: 'Name, age, and gender are required' });
        }

        // Generate UHID
        const uhid = await generateUHID(tenantId);

        // Insert patient
        const result = await query(
            `INSERT INTO patients (tenant_id, uhid, name, age, gender, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [tenantId, uhid, name, age, gender, phone, address]
        );

        res.status(201).json({
            message: 'Patient registered successfully',
            patient: result.rows[0],
        });

    } catch (error) {
        console.error('Patient registration error:', error);
        res.status(500).json({ error: 'Failed to register patient' });
    }
};

/**
 * Get all patients (with pagination and search)
 */
const getPatients = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { page = 1, limit = 20, search = '' } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
      SELECT * FROM patients 
      WHERE tenant_id = $1
    `;
        let params = [tenantId];

        // Add search filter
        if (search) {
            queryText += ` AND (name ILIKE $2 OR uhid ILIKE $2 OR phone ILIKE $2)`;
            params.push(`%${search}%`);
        }

        queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await query(queryText, params);

        // Get total count
        const countResult = await query(
            'SELECT COUNT(*) FROM patients WHERE tenant_id = $1',
            [tenantId]
        );

        res.json({
            patients: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            totalPages: Math.ceil(countResult.rows[0].count / limit),
        });

    } catch (error) {
        console.error('Get patients error:', error);
        res.status(500).json({ error: 'Failed to fetch patients' });
    }
};

/**
 * Get patient by ID with history
 */
const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        // Get patient details
        const patientResult = await query(
            'SELECT * FROM patients WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (patientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // Get patient's invoice history
        const invoicesResult = await query(
            `SELECT i.*, d.name as doctor_name
       FROM invoices i
       LEFT JOIN doctors d ON i.doctor_id = d.id
       WHERE i.patient_id = $1 AND i.tenant_id = $2
       ORDER BY i.created_at DESC`,
            [id, tenantId]
        );

        res.json({
            patient: patientResult.rows[0],
            invoices: invoicesResult.rows,
        });

    } catch (error) {
        console.error('Get patient error:', error);
        res.status(500).json({ error: 'Failed to fetch patient details' });
    }
};

/**
 * Update patient
 */
const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, gender, phone, address } = req.body;
        const tenantId = req.tenantId;

        const result = await query(
            `UPDATE patients 
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           gender = COALESCE($3, gender),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address)
       WHERE id = $6 AND tenant_id = $7
       RETURNING *`,
            [name, age, gender, phone, address, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.json({
            message: 'Patient updated successfully',
            patient: result.rows[0],
        });

    } catch (error) {
        console.error('Update patient error:', error);
        res.status(500).json({ error: 'Failed to update patient' });
    }
};

module.exports = {
    registerPatient,
    getPatients,
    getPatientById,
    updatePatient,
};
