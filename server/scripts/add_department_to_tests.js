require('dotenv').config();
const { query } = require('../config/db');

async function migrate() {
    console.log('Adding department column to tests table...');
    try {
        await query(`
      ALTER TABLE tests 
      ADD COLUMN IF NOT EXISTS department VARCHAR(50) DEFAULT 'GENERAL'
    `);
        console.log('✅ Column added (or already exists).');

        // Back-fill from category: map known radiology categories to their departments
        await query(`
      UPDATE tests SET department = CASE
        WHEN category ILIKE '%MRI%'        THEN 'MRI'
        WHEN category ILIKE '%CT%'         THEN 'CT'
        WHEN category ILIKE '%USG%' OR category ILIKE '%ULTRA%' THEN 'USG'
        WHEN category ILIKE '%XRAY%' OR category ILIKE '%X-RAY%' OR category ILIKE '%X RAY%' THEN 'XRAY'
        WHEN category ILIKE '%ECG%'        THEN 'ECG'
        WHEN category ILIKE '%RADIOL%'     THEN 'RADIOLOGY'
        ELSE 'GENERAL'
      END
      WHERE department IS NULL OR department = 'GENERAL'
    `);
        console.log('✅ Existing tests back-filled based on category.');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    }
}

migrate();
