const { query } = require('../config/db');

/**
 * Get all tests (Test Master)
 */
const getTests = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { category, search } = req.query;

        let queryText = 'SELECT * FROM tests WHERE tenant_id = $1';
        let params = [tenantId];

        if (category) {
            queryText += ' AND category = $2';
            params.push(category);
        }

        if (search) {
            const searchParam = params.length === 1 ? '$2' : '$3';
            queryText += ` AND (name ILIKE ${searchParam} OR code ILIKE ${searchParam})`;
            params.push(`%${search}%`);
        }

        queryText += ' ORDER BY name';

        const result = await query(queryText, params);

        res.json({ tests: result.rows });

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
            price,
            cost,
            tatHours,
            normalRangeMale,
            normalRangeFemale,
            unit,
            sampleType,
            gstPercentage,
        } = req.body;

        const tenantId = req.tenantId;

        // Validation
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const result = await query(
            `INSERT INTO tests (
        tenant_id, name, code, category, price, cost, tat_hours,
        normal_range_male, normal_range_female, unit, sample_type, gst_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
            [
                tenantId, name, code, category, price, cost, tatHours,
                normalRangeMale, normalRangeFemale, unit, sampleType, gstPercentage || 0
            ]
        );

        res.status(201).json({
            message: 'Test added successfully',
            test: result.rows[0],
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
            price,
            cost,
            tatHours,
            normalRangeMale,
            normalRangeFemale,
            unit,
            sampleType,
            gstPercentage,
        } = req.body;

        const tenantId = req.tenantId;

        const result = await query(
            `UPDATE tests SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        category = COALESCE($3, category),
        price = COALESCE($4, price),
        cost = COALESCE($5, cost),
        tat_hours = COALESCE($6, tat_hours),
        normal_range_male = COALESCE($7, normal_range_male),
        normal_range_female = COALESCE($8, normal_range_female),
        unit = COALESCE($9, unit),
        sample_type = COALESCE($10, sample_type),
        gst_percentage = COALESCE($11, gst_percentage)
      WHERE id = $12 AND tenant_id = $13
      RETURNING *`,
            [
                name, code, category, price, cost, tatHours,
                normalRangeMale, normalRangeFemale, unit, sampleType, gstPercentage,
                id, tenantId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Test not found' });
        }

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
