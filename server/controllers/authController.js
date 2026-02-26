const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Register a new tenant (Lab) - SaaS Signup
 */
const registerTenant = async (req, res) => {
    try {
        const {
            labName,
            licenseNumber,
            gstNumber,
            contactEmail,
            contactPhone,
            address,
            adminName,
            adminEmail,
            password
        } = req.body;

        // Validation
        if (!labName || !adminEmail || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if email already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [adminEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Start transaction
        const client = await require('../config/db').pool.connect();

        try {
            await client.query('BEGIN');

            // Create tenant
            const tenantResult = await client.query(
                `INSERT INTO tenants (name, license_number, gst_number, contact_email, contact_phone, address, subscription_plan)
         VALUES ($1, $2, $3, $4, $5, $6, 'FREE')
         RETURNING id`,
                [labName, licenseNumber, gstNumber, contactEmail, contactPhone, address]
            );

            const tenantId = tenantResult.rows[0].id;

            // Create main branch
            const branchResult = await client.query(
                `INSERT INTO branches (tenant_id, name, address, is_main_branch)
         VALUES ($1, $2, $3, true)
         RETURNING id`,
                [tenantId, `${labName} - Main Branch`, address]
            );

            const branchId = branchResult.rows[0].id;

            // Create admin user
            await client.query(
                `INSERT INTO users (tenant_id, branch_id, name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, 'ADMIN', true)`,
                [tenantId, branchId, adminName, adminEmail, passwordHash]
            );

            await client.query('COMMIT');

            res.status(201).json({
                message: 'Lab registered successfully',
                tenantId,
                email: adminEmail,
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

/**
 * Login - Returns JWT token
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Get user with tenant info
        const result = await query(
            `SELECT u.id, u.tenant_id, u.branch_id, u.name, u.email, u.password_hash, u.role, u.is_active,
              u.can_view, u.can_create, u.can_update,
              t.name as tenant_name, t.subscription_plan
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                tenantId: user.tenant_id,
                branchId: user.branch_id,
                role: user.role,
                email: user.email,
                canView: user.can_view,
                canCreate: user.can_create,
                canUpdate: user.can_update,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantName: user.tenant_name,
                subscriptionPlan: user.subscription_plan,
                canView: user.can_view,
                canCreate: user.can_create,
                canUpdate: user.can_update,
            },
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * Refresh token
 */
const refreshToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Verify old token (even if expired)
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

        // Generate new token
        const newToken = jwt.sign(
            {
                userId: decoded.userId,
                tenantId: decoded.tenantId,
                branchId: decoded.branchId,
                role: decoded.role,
                email: decoded.email,
                canView: decoded.canView,
                canCreate: decoded.canCreate,
                canUpdate: decoded.canUpdate,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({ token: newToken });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * Change password for the authenticated user
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Fetch current password hash
        const result = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password and update, and invalidate all existing sessions
        const newHash = await bcrypt.hash(newPassword, 10);
        await query(
            'UPDATE users SET password_hash = $1, sessions_invalidated_at = NOW() WHERE id = $2',
            [newHash, userId]
        );

        res.json({ message: 'Password changed successfully. All other sessions have been logged out.' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
};

/**
 * Close all active sessions for the authenticated user
 */
const closeAllSessions = async (req, res) => {
    try {
        const userId = req.user.userId;

        await query(
            'UPDATE users SET sessions_invalidated_at = NOW() WHERE id = $1',
            [userId]
        );

        res.json({ message: 'All sessions have been closed. Please log in again.' });

    } catch (error) {
        console.error('Close all sessions error:', error);
        res.status(500).json({ error: 'Failed to close sessions' });
    }
};

module.exports = {
    registerTenant,
    login,
    refreshToken,
    changePassword,
    closeAllSessions,
};
