const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(tenantGuard);
router.use(checkRole(['ADMIN']));

// GET /api/audit — paginated, filterable audit log
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const {
            page = 1,
            limit = 50,
            action,
            entityType,
            userId,
            from,
            to,
            search
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let conditions = ['al.tenant_id = $1'];
        let params = [tenantId];
        let p = 1;

        if (action) { p++; conditions.push(`al.action = $${p}`); params.push(action.toUpperCase()); }
        if (entityType) { p++; conditions.push(`al.entity_type = $${p}`); params.push(entityType.toUpperCase()); }
        if (userId) { p++; conditions.push(`al.user_id = $${p}`); params.push(userId); }
        if (from) { p++; conditions.push(`al.created_at >= $${p}`); params.push(from); }
        if (to) { p++; conditions.push(`al.created_at <= $${p}`); params.push(to + ' 23:59:59'); }
        if (search) {
            p++;
            conditions.push(`(al.details ILIKE $${p} OR al.entity_id::text ILIKE $${p} OR u.name ILIKE $${p})`);
            params.push(`%${search}%`);
        }

        const where = conditions.join(' AND ');

        const dataQuery = `
            SELECT al.*, u.name as user_name, u.role as user_role
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE ${where}
            ORDER BY al.created_at DESC
            LIMIT $${p + 1} OFFSET $${p + 2}
        `;
        params.push(parseInt(limit), offset);

        const countQuery = `
            SELECT COUNT(*) FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE ${where}
        `;
        const countParams = params.slice(0, p); // exclude limit/offset

        const [dataRes, countRes] = await Promise.all([
            query(dataQuery, params),
            query(countQuery, countParams)
        ]);

        const total = parseInt(countRes.rows[0].count);

        res.json({
            logs: dataRes.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (err) {
        console.error('Audit log fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// GET /api/audit/summary — action/entity type counts for the last 30 days
router.get('/summary', async (req, res) => {
    try {
        const tenantId = req.tenantId;

        const [actionsRes, entitiesRes, recentUsersRes] = await Promise.all([
            query(
                `SELECT action, COUNT(*) as count FROM audit_logs
                 WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
                 GROUP BY action ORDER BY count DESC`,
                [tenantId]
            ),
            query(
                `SELECT entity_type, COUNT(*) as count FROM audit_logs
                 WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
                 GROUP BY entity_type ORDER BY count DESC`,
                [tenantId]
            ),
            query(
                `SELECT u.name, u.role, COUNT(*) as actions
                 FROM audit_logs al
                 JOIN users u ON al.user_id = u.id
                 WHERE al.tenant_id = $1 AND al.created_at >= NOW() - INTERVAL '30 days'
                 GROUP BY u.id, u.name, u.role
                 ORDER BY actions DESC LIMIT 5`,
                [tenantId]
            )
        ]);

        res.json({
            byAction: actionsRes.rows,
            byEntity: entitiesRes.rows,
            topUsers: recentUsersRes.rows
        });

    } catch (err) {
        console.error('Audit summary error:', err);
        res.status(500).json({ error: 'Failed to fetch audit summary' });
    }
});

module.exports = router;
