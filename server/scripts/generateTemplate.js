const { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } = require('docx');
const fs = require('fs');
const path = require('path');

const createTemplate = async (title, filename, specificFields = []) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: title,
                            bold: true,
                            size: 32,
                            color: "2c3e50"
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),

                // Patient Info Header Table-like Structure
                new Paragraph({
                    children: [
                        new TextRun({ text: "Patient Name: ", bold: true }),
                        new TextRun("{{patient_name}}"),
                        new TextRun({ text: "\t\t\t\tPatient ID: ", bold: true }),
                        new TextRun("{{patient_id}}"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Age / Gender: ", bold: true }),
                        new TextRun("{{age}} / {{gender}}"),
                        new TextRun({ text: "\t\t\t\tDate: ", bold: true }),
                        new TextRun("{{report_date}}"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Ref Doctor: ", bold: true }),
                        new TextRun("{{ref_doctor}}"),
                    ],
                }),

                ...specificFields.map(field => new Paragraph({
                    children: [
                        new TextRun({ text: `${field.label}: `, bold: true }),
                        new TextRun(`{{${field.key}}}`),
                    ],
                })),

                new Paragraph({ text: "", spacing: { before: 200, after: 200 } }),

                new Paragraph({
                    children: [
                        new TextRun({ text: "FINDINGS:", bold: true, size: 24, underline: { type: UnderlineType.SINGLE } }),
                    ],
                    spacing: { after: 200 }
                }),

                // This will be replaced by the HTML/Text from the editor
                new Paragraph({
                    children: [
                        new TextRun("{{findings}}"),
                    ],
                    spacing: { after: 400 }
                }),

                new Paragraph({
                    children: [
                        new TextRun({ text: "IMPRESSION:", bold: true, size: 24, underline: { type: UnderlineType.SINGLE } }),
                    ],
                    spacing: { after: 200 }
                }),

                new Paragraph({
                    children: [
                        new TextRun("{{impression}}"),
                    ],
                    spacing: { after: 600 }
                }),

                new Paragraph({
                    children: [
                        new TextRun({ text: "Radiologist:", bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("{{radiologist_name}}"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("{{qualification}}"),
                    ],
                }),

                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({
                    children: [
                        new TextRun("Signature:"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("_________________________"),
                    ],
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(__dirname, '../templates', filename), buffer);
    console.log(`Generated: ${filename}`);
};

const run = async () => {
    const templateDir = path.join(__dirname, '../templates');
    if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
    }

    await createTemplate("RADIOLOGY REPORT", "radiology_generic.docx");
    await createTemplate("X-RAY CHEST (PA VIEW) REPORT", "xray_chest.docx");
    await createTemplate("ULTRASOUND WHOLE ABDOMEN REPORT", "usg_abdomen.docx");
    await createTemplate("CT SCAN BRAIN REPORT", "ct_brain.docx");
    await createTemplate("MRI LUMBOSACRAL SPINE REPORT", "mri_spine.docx");
    await createTemplate("ECG REPORT", "ecg_report.docx", [
        { label: "Heart Rate", key: "heart_rate" },
        { label: "Rhythm", key: "rhythm" },
        { label: "Axis", key: "axis" }
    ]);
};

run().catch(console.error);
