const { query } = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

/**
 * Get all tests (Test Master)
 */
const getTests = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { category, department, search } = req.query;

        let queryText = 'SELECT * FROM tests WHERE tenant_id = $1';
        let params = [tenantId];

        if (category) {
            queryText += ` AND category = $${params.length + 1}`;
            params.push(category);
        }

        if (department) {
            queryText += ` AND department = $${params.length + 1}`;
            params.push(department);
        }

        if (search) {
            queryText += ` AND (name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }

        queryText += ' ORDER BY name';

        const result = await query(queryText, params);

        // Fetch sub-tests for profiles
        const profilesQuery = `
            SELECT pi.profile_id, pi.test_id, t.name, t.code, pi.sort_order
            FROM test_profile_items pi
            JOIN tests t ON pi.test_id = t.id
            WHERE t.tenant_id = $1
            ORDER BY pi.sort_order
        `;
        const profileItemsRes = await query(profilesQuery, [tenantId]);

        const tests = result.rows.map(test => {
            if (test.is_profile) {
                test.profileItems = profileItemsRes.rows.filter(pi => pi.profile_id === test.id);
            }
            return test;
        });

        res.json({ tests });

    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ error: 'Failed to fetch tests' });
    }
};

/**
 * Add new test to catalog
 */
const addTest = async (req, res) => {
    try {
        const {
            name,
            code,
            category,
            department,
            price,
            cost,
            tatHours,
            normalRangeMale,
            normalRangeFemale,
            unit,
            sampleType,
            gstPercentage,
            isProfile,
            profileItems
        } = req.body;

        const tenantId = req.tenantId;

        // Validation
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const result = await query(
            `INSERT INTO tests (
        tenant_id, name, code, category, department, price, cost, tat_hours,
        normal_range_male, normal_range_female, unit, sample_type, gst_percentage, is_profile
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
            [
                tenantId, name, code, category, department || 'GENERAL', price, cost, tatHours,
                normalRangeMale, normalRangeFemale, unit, sampleType, gstPercentage || 0, isProfile ? true : false
            ]
        );

        const newTest = result.rows[0];

        if (isProfile && profileItems && Array.isArray(profileItems)) {
            for (let i = 0; i < profileItems.length; i++) {
                await query(
                    `INSERT INTO test_profile_items (profile_id, test_id, sort_order) VALUES ($1, $2, $3)`,
                    [newTest.id, profileItems[i], i]
                );
            }
        }

        await logAuditEvent({
            tenantId,
            userId: req.user?.userId,
            action: 'CREATE',
            entityType: 'TEST',
            entityId: newTest.id,
            newValues: { name, code, price, cost },
            details: `Created test/profile ${code} - ${name}`
        });

        res.status(201).json({
            message: 'Test added successfully',
            test: newTest,
        });

    } catch (error) {
        console.error('Add test error:', error);
        res.status(500).json({ error: 'Failed to add test' });
    }
};

/**
 * Update test
 */
const updateTest = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            code,
            category,
            department,
            price,
            cost,
            tatHours,
            normalRangeMale,
            normalRangeFemale,
            unit,
            sampleType,
            gstPercentage,
            isProfile,
            profileItems
        } = req.body;

        const tenantId = req.tenantId;

        // Parse gstPercentage explicitly — the <select> returns a string (e.g. "0"),
        // and we must ensure numeric 0 is stored, not skipped.
        const parsedGst = parseFloat(gstPercentage);
        const gstValue = isNaN(parsedGst) ? 0 : parsedGst;

        const result = await query(
            `UPDATE tests SET
        name = $1,
        code = $2,
        category = $3,
        department = COALESCE($4, department),
        price = $5,
        cost = $6,
        tat_hours = COALESCE($7, tat_hours),
        normal_range_male = COALESCE($8, normal_range_male),
        normal_range_female = COALESCE($9, normal_range_female),
        unit = COALESCE($10, unit),
        sample_type = COALESCE($11, sample_type),
        gst_percentage = $12,
        is_profile = COALESCE($13, is_profile)
      WHERE id = $14 AND tenant_id = $15
      RETURNING *`,
            [
                name, code, category, department || null, price, cost, tatHours,
                normalRangeMale, normalRangeFemale, unit, sampleType, gstValue,
                isProfile !== undefined ? isProfile : null,
                id, tenantId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test not found' });
        }

        if (isProfile && profileItems && Array.isArray(profileItems)) {
            // Remove existing sub-tests
            await query(`DELETE FROM test_profile_items WHERE profile_id = $1`, [id]);

            // Add new sub-tests
            for (let i = 0; i < profileItems.length; i++) {
                await query(
                    `INSERT INTO test_profile_items (profile_id, test_id, sort_order) VALUES ($1, $2, $3)`,
                    [id, profileItems[i], i]
                );
            }
        }

        await logAuditEvent({
            tenantId,
            userId: req.user?.userId,
            action: 'UPDATE',
            entityType: 'TEST',
            entityId: id,
            newValues: { name, price, tatHours },
            details: `Updated test ${id}`
        });

        res.json({
            message: 'Test updated successfully',
            test: result.rows[0],
        });

    } catch (error) {
        console.error('Update test error:', error);
        res.status(500).json({ error: 'Failed to update test' });
    }
};

/**
 * Delete test
 */
const deleteTest = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const result = await query(
            'DELETE FROM tests WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test not found' });
        }

        await logAuditEvent({
            tenantId,
            userId: req.user?.userId,
            action: 'DELETE',
            entityType: 'TEST',
            entityId: id,
            details: `Deleted test ${id}`
        });

        res.json({ message: 'Test deleted successfully' });

    } catch (error) {
        console.error('Delete test error:', error);
        res.status(500).json({ error: 'Failed to delete test' });
    }
};

module.exports = {
    getTests,
    addTest,
    updateTest,
    deleteTest,
};
