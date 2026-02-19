const { Document, Packer, Paragraph, TextRun } = require('docx');
const fs = require('fs');
const path = require('path');

const generateTemplate = async () => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Radiology Report",
                            bold: true,
                            size: 32,
                        }),
                    ],
                    alignment: "center",
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Patient Name: ", bold: true }),
                        new TextRun("{{patient_name}}"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Age/Gender: ", bold: true }),
                        new TextRun("{{age}} / {{gender}}"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Ref Doctor: ", bold: true }),
                        new TextRun("{{doctor_name}}"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Date: ", bold: true }),
                        new TextRun("{{report_date}}"),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "FINDINGS:", bold: true, underline: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("{{findings}}"),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "IMPRESSION:", bold: true, underline: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("{{impression}}"),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Signature:", bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("{{radiologist_name}}"),
                    ],
                }),
            ],
        }],
    });

    const templateDir = path.join(__dirname, '../templates');
    if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
    }

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(templateDir, 'radiology_template.docx'), buffer);
    console.log('Template generated successfully at templates/radiology_template.docx');
};

generateTemplate().catch(console.error);
