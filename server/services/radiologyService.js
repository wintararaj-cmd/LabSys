const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { query } = require('../config/db');

/**
 * Radiology Service to handle .docx template replacement and PDF conversion
 */
const radiologyService = {
    /**
     * Generate Radiology Report
     * @param {Object} data - Data to replace in template
     * @param {string} templateName - Name of the template file
     * @returns {Promise<Object>} - Paths to generated docx and pdf
     */
    generateReport: async (data, templateName = 'radiology_template.docx') => {
        try {
            const templatePath = path.join(__dirname, '../templates', templateName);
            const content = fs.readFileSync(templatePath, 'binary');

            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            // Replace placeholders
            doc.render(data);

            const buf = doc.getZip().generate({
                type: 'nodebuffer',
                compression: 'DEFLATE',
            });

            const outputDir = path.join(__dirname, '../uploads/radiology');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const timestamp = Date.now();
            const docxFileName = `report_${data.report_id || timestamp}.docx`;
            const docxPath = path.join(outputDir, docxFileName);

            fs.writeFileSync(docxPath, buf);

            // Convert to PDF using LibreOffice if available
            const pdfFileName = docxFileName.replace('.docx', '.pdf');
            const pdfPath = path.join(outputDir, pdfFileName);

            try {
                await radiologyService.convertToPdf(docxPath, outputDir);
                return {
                    docxPath: `/uploads/radiology/${docxFileName}`,
                    pdfPath: `/uploads/radiology/${pdfFileName}`,
                    success: true
                };
            } catch (pdfError) {
                console.error('PDF Conversion failed:', pdfError.message);
                return {
                    docxPath: `/uploads/radiology/${docxFileName}`,
                    pdfPath: null,
                    success: true,
                    message: 'DOCX generated, but PDF conversion failed. Ensure LibreOffice is installed.'
                };
            }
        } catch (error) {
            console.error('Radiology report generation error:', error);
            throw error;
        }
    },

    /**
     * Convert DOCX to PDF using LibreOffice
     */
    convertToPdf: (docxPath, outputDir) => {
        return new Promise((resolve, reject) => {
            // Try common paths for LibreOffice on Windows
            const possiblePaths = [
                'soffice',
                '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"',
                '"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"'
            ];

            let found = false;
            let currentPathIndex = 0;

            const tryNext = () => {
                if (currentPathIndex >= possiblePaths.length) {
                    return reject(new Error('LibreOffice not found in system path or standard locations'));
                }

                const cmd = `${possiblePaths[currentPathIndex]} --headless --convert-to pdf --outdir "${outputDir}" "${docxPath}"`;

                exec(cmd, (error, stdout, stderr) => {
                    if (error) {
                        currentPathIndex++;
                        tryNext();
                    } else {
                        resolve(stdout);
                    }
                });
            };

            tryNext();
        });
    }
};

module.exports = radiologyService;
