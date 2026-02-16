const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPdfGeneration() {
    console.log('Testing PDF generation...');
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser launched successfully.');

        const page = await browser.newPage();
        await page.setContent('<h1>Hello World</h1><p>Expected PDF content.</p>');

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({ format: 'A4' });

        console.log('PDF generated successfully. Buffer length:', pdfBuffer.length);

        const outputPath = path.join(__dirname, 'test-output.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`Saved PDF to ${outputPath}`);

        await browser.close();
        console.log('Browser closed.');

        console.log('✅ PDF Generation Test PASSED!');

    } catch (error) {
        console.error('❌ PDF Generation Test FAILED:', error);
    }
}

testPdfGeneration();
