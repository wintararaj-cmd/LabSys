require('dotenv').config();
const { pool } = require('../config/db');

const templates = [
    {
        name: 'X-RAY CHEST (PA VIEW)',
        category: 'Radiology',
        file_path: 'xray_chest.docx',
        default_findings: `Lung fields are clear.
No focal consolidation.
No pleural effusion.
Cardiac size appears normal.
Bony thorax is unremarkable.`,
        default_impression: `No radiographic evidence of active cardiopulmonary disease.`
    },
    {
        name: 'USG WHOLE ABDOMEN',
        category: 'Radiology',
        file_path: 'usg_abdomen.docx',
        default_findings: `LIVER: Size and echotexture are normal. No focal lesion detected.
GALL BLADDER: Normal wall thickness. No calculi or sludge seen.
PANCREAS: Normal in size and echotexture.
SPLEEN: Normal size and echotexture.
KIDNEYS: Both kidneys normal in size. No hydronephrosis or calculus.
URINARY BLADDER: Well distended. No intraluminal lesion.`,
        default_impression: `No significant abnormality detected.`
    },
    {
        name: 'CT BRAIN (PLAIN)',
        category: 'Radiology',
        file_path: 'ct_brain.docx',
        default_findings: `TECHNIQUE: Non-contrast CT scan of brain performed.
        
No intracranial hemorrhage.
No mass lesion.
Ventricular system is normal.
No midline shift.
Basal cisterns are patent.
Calvarium intact.`,
        default_impression: `No acute intracranial pathology detected.`
    },
    {
        name: 'MRI LUMBAR SPINE',
        category: 'Radiology',
        file_path: 'mri_spine.docx',
        default_findings: `Vertebral bodies maintain normal height and alignment.
Disc desiccation noted at L4-L5.
Mild posterior disc bulge at L4-L5 causing mild canal narrowing.
No significant nerve root compression.`,
        default_impression: `Mild degenerative changes at L4-L5 level.`
    },
    {
        name: 'ECG REPORT',
        category: 'Radiology',
        file_path: 'ecg_report.docx',
        default_findings: `Heart Rate: bpm
Rhythm: Sinus rhythm
Axis: Normal
ST-T Changes: None`,
        default_impression: `Normal ECG.`
    }
];

async function seedTemplates() {
    try {
        console.log('Seeding Radiology Templates...');

        // Use NULL for tenant_id to make them global templates
        const tenantId = null;

        console.log('Cleaning up duplicate templates...');
        const deleteDupRes = await pool.query(`
            DELETE FROM report_templates
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY id ASC) as rn
                    FROM report_templates
                ) t WHERE t.rn > 1
            ) RETURNING id;
        `);
        console.log(`Cleaned up ${deleteDupRes.rowCount} duplicate template entries.`);

        for (const t of templates) {
            const check = await pool.query(
                'SELECT id FROM report_templates WHERE name = $1',
                [t.name]
            );

            if (check.rows.length === 0) {
                await pool.query(
                    `INSERT INTO report_templates (tenant_id, name, category, file_path, default_findings, default_impression)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [tenantId, t.name, t.category, t.file_path, t.default_findings, t.default_impression]
                );
            }
        }

        console.log('Templates seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedTemplates();
