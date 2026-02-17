const { pool } = require('../config/db');

const getExternalLabs = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await pool.query(
            'SELECT * FROM external_labs WHERE tenant_id = $1 ORDER BY created_at DESC',
            [tenantId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching external labs:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createExternalLab = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { name, contact_person, phone, email, address } = req.body;

        const result = await pool.query(
            `INSERT INTO external_labs (tenant_id, name, contact_person, phone, email, address)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [tenantId, name, contact_person, phone, email, address]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating external lab:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateExternalLab = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const { name, contact_person, phone, email, address } = req.body;

        const result = await pool.query(
            `UPDATE external_labs 
             SET name = $1, contact_person = $2, phone = $3, email = $4, address = $5
             WHERE id = $6 AND tenant_id = $7 RETURNING *`,
            [name, contact_person, phone, email, address, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'External lab not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating external lab:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteExternalLab = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const result = await pool.query(
            'DELETE FROM external_labs WHERE id = $1 AND tenant_id = $2 RETURNING *',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'External lab not found' });
        }

        res.json({ message: 'External lab deleted successfully' });
    } catch (error) {
        console.error('Error deleting external lab:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getExternalLabs,
    createExternalLab,
    updateExternalLab,
    deleteExternalLab
};
