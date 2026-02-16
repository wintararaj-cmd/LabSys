const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Get all users (staff)
 */
const getUsers = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await query(
            `SELECT u.id, u.name, u.email, u.role, u.is_active, u.branch_id,
                    b.name as branch_name
             FROM users u
             LEFT JOIN branches b ON u.branch_id = b.id
             WHERE u.tenant_id = $1
             ORDER BY u.name`,
            [tenantId]
        );
        res.json({ users: result.rows });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

/**
 * Create new user
 */
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, branchId } = req.body;
        const tenantId = req.tenantId;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate role
        const validRoles = ['ADMIN', 'DOCTOR', 'TECHNICIAN', 'RECEPTIONIST'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Check user existence
        const exists = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        if (exists.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const result = await query(
            `INSERT INTO users (tenant_id, branch_id, name, email, password_hash, role, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING id, name, email, role, branch_id`,
            [tenantId, branchId || null, name, email, passwordHash, role]
        );

        res.status(201).json({
            message: 'User created successfully',
            user: result.rows[0],
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

module.exports = {
    getUsers,
    createUser,
};
