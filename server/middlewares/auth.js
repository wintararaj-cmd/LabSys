const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Middleware to verify JWT token and attach user to request
 */
const verifyToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token signature & expiry
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if all sessions have been invalidated after this token was issued
        const result = await query(
            'SELECT sessions_invalidated_at FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length > 0) {
            const { sessions_invalidated_at } = result.rows[0];
            if (sessions_invalidated_at) {
                const tokenIssuedAt = new Date(decoded.iat * 1000);
                if (tokenIssuedAt < new Date(sessions_invalidated_at)) {
                    return res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
                }
            }
        }

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            role: decoded.role,
            branchId: decoded.branchId,
            email: decoded.email,
            canView: decoded.canView,
            canCreate: decoded.canCreate,
            canUpdate: decoded.canUpdate,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * Middleware to check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles
 */
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            // Fallback to specific permissions
            let hasPermission = false;
            
            if (req.method === 'GET' && req.user.canView) hasPermission = true;
            if (req.method === 'POST' && req.user.canCreate) hasPermission = true;
            if ((req.method === 'PUT' || req.method === 'PATCH') && req.user.canUpdate) hasPermission = true;
            
            if (!hasPermission) {
                return res.status(403).json({
                    error: 'Forbidden: Insufficient permissions',
                    required: allowedRoles,
                    current: req.user.role
                });
            }
        }

        next();
    };
};

/**
 * CRITICAL: Tenant isolation middleware
 * Ensures all queries are scoped to the user's tenant
 * This prevents data leaks between different labs in the SaaS system
 */
const tenantGuard = (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ error: 'Tenant information missing' });
    }

    // Attach tenant ID to request for easy access in controllers
    req.tenantId = req.user.tenantId;
    next();
};

module.exports = {
    verifyToken,
    checkRole,
    tenantGuard,
};
