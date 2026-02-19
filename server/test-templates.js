require('dotenv').config();
const { query } = require('./config/db');

async function testTemplateFetch() {
    try {
        const tenantId = 1; // Simulating tenant ID 1
        console.log('Testing template fetch for tenantId:', tenantId);

        const result = await query(
            'SELECT * FROM report_templates WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY name',
            [tenantId]
        );

        console.log('Found templates:', result.rows.length);
        console.log(result.rows.map(t => t.name));
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testTemplateFetch();
