const { query } = require('../config/db');

/**
 * Get all branches
 */
const getBranches = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await query(
            'SELECT * FROM branches WHERE tenant_id = $1 ORDER BY is_main_branch DESC, name ASC',
            [tenantId]
        );
        res.json({ branches: result.rows });
    } catch (error) {
        console.error('Get branches error:', error);
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
};

/**
 * Create new branch
 */
const createBranch = async (req, res) => {
    try {
        const { name, address, phone } = req.body;
        const tenantId = req.tenantId;

        if (!name) {
            return res.status(400).json({ error: 'Branch name is required' });
        }

        const result = await query(
            `INSERT INTO branches (tenant_id, name, address, phone, is_main_branch)
             VALUES ($1, $2, $3, $4, false)
             RETURNING *`,
            [tenantId, name, address, phone]
        );

        res.status(201).json({
            message: 'Branch created successfully',
            branch: result.rows[0],
        });
    } catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({ error: 'Failed to create branch' });
    }
};

module.exports = {
    getBranches,
    createBranch,
};
