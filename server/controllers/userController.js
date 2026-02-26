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
                    u.can_view, u.can_create, u.can_update, u.module_permissions,
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
        const { name, email, password, role, branchId, canView = true, canCreate = true, canUpdate = true, modulePermissions = {} } = req.body;
        const tenantId = req.tenantId;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate role
        const validRoles = ['ADMIN', 'DOCTOR', 'TECHNICIAN', 'RECEPTIONIST', 'RADIOLOGIST', 'ACCOUNTANT'];
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
            `INSERT INTO users (tenant_id, branch_id, name, email, password_hash, role, is_active, can_view, can_create, can_update, module_permissions)
             VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10)
             RETURNING id, name, email, role, branch_id, can_view as "canView", can_create as "canCreate", can_update as "canUpdate", module_permissions as "modulePermissions"`,
            [tenantId, branchId || null, name, email, passwordHash, role, canView, canCreate, canUpdate, modulePermissions]
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

/**
 * Update user details
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, branchId, canView, canCreate, canUpdate, modulePermissions } = req.body;
        const tenantId = req.tenantId;

        if (!name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const validRoles = ['ADMIN', 'DOCTOR', 'TECHNICIAN', 'RECEPTIONIST', 'RADIOLOGIST', 'ACCOUNTANT'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const result = await query(
            `UPDATE users 
             SET name = $1, role = $2, branch_id = $3,
                 can_view = COALESCE($6, can_view), can_create = COALESCE($7, can_create), can_update = COALESCE($8, can_update),
                 module_permissions = COALESCE($9, module_permissions)
             WHERE id = $4 AND tenant_id = $5
             RETURNING id, name, email, role, branch_id, is_active, can_view as "canView", can_create as "canCreate", can_update as "canUpdate", module_permissions as "modulePermissions"`,
            [name, role, branchId || null, id, tenantId, canView, canCreate, canUpdate, modulePermissions]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User updated successfully',
            user: result.rows[0],
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

/**
 * Toggle user status
 */
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const result = await query(
            `UPDATE users 
             SET is_active = NOT is_active
             WHERE id = $1 AND tenant_id = $2
             RETURNING id, is_active`,
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'User status updated',
            user: result.rows[0],
        });

    } catch (error) {
        console.error('Toggle status error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    toggleUserStatus,
};
