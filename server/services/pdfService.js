const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../config/db');

/**
 * Generate QR Code (using simple data URL approach)
 * In production, use a library like 'qrcode'
 */
const generateQRCode = async (data) => {
  // Placeholder - in production use: const QRCode = require('qrcode');
  // return await QRCode.toDataURL(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
};

/**
 * Generate Report PDF
 */
const generateReportPDF = async (invoiceId, tenantId) => {
  try {
    // Get invoice and patient details
    const invoiceResult = await query(
      `SELECT i.*, p.name as patient_name, p.uhid, p.age, p.gender, p.phone,
              d.name as doctor_name, t.name as tenant_name, t.address as lab_address,
              t.contact_phone as lab_phone, t.logo_url
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       LEFT JOIN doctors d ON i.doctor_id = d.id
       JOIN tenants t ON i.tenant_id = t.id
       WHERE i.id = $1 AND i.tenant_id = $2`,
      [invoiceId, tenantId]
    );

    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceResult.rows[0];

    // Get reports with results
    const reportsResult = await query(
      `SELECT r.*, t.name as test_name, t.code as test_code,
              t.normal_range_male, t.normal_range_female, t.unit,
              u1.name as technician_name, u2.name as pathologist_name
       FROM reports r
       JOIN tests t ON r.test_id = t.id
       LEFT JOIN users u1 ON r.technician_id = u1.id
       LEFT JOIN users u2 ON r.pathologist_id = u2.id
       WHERE r.invoice_id = $1 AND r.status IN ('COMPLETED', 'VERIFIED')`,
      [invoiceId]
    );

    const reports = reportsResult.rows;

    // Generate QR code for verification
    const verificationUrl = `${process.env.CLIENT_URL}/verify/${invoiceId}`;
    const qrCodeUrl = await generateQRCode(verificationUrl);

    // Determine normal range based on gender
    const normalRangeKey = invoice.gender === 'Male' ? 'normal_range_male' : 'normal_range_female';

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { color: #2c3e50; font-size: 24px; }
    .header p { color: #555; font-size: 12px; margin-top: 5px; }
    .patient-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .patient-info div { flex: 1; }
    .patient-info p { font-size: 12px; margin: 5px 0; }
    .patient-info strong { color: #2c3e50; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
    th { background-color: #34495e; color: white; }
    .abnormal { color: #e74c3c; font-weight: bold; }
    .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: center; }
    .signatures { display: flex; gap: 100px; }
    .signature { text-align: center; }
    .signature p { margin-top: 40px; border-top: 1px solid #333; padding-top: 5px; font-size: 11px; }
    .qr-code { text-align: center; }
    .qr-code img { width: 100px; height: 100px; }
    .qr-code p { font-size: 10px; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${invoice.tenant_name}</h1>
    <p>${invoice.lab_address}</p>
    <p>Phone: ${invoice.lab_phone}</p>
    <p><strong>PATHOLOGY REPORT</strong></p>
  </div>

  <div class="patient-info">
    <div>
      <p><strong>Patient Name:</strong> ${invoice.patient_name}</p>
      <p><strong>UHID:</strong> ${invoice.uhid}</p>
      <p><strong>Age/Gender:</strong> ${invoice.age} / ${invoice.gender}</p>
    </div>
    <div>
      <p><strong>Invoice No:</strong> ${invoice.invoice_number}</p>
      <p><strong>Sample Date:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</p>
      <p><strong>Ref. Doctor:</strong> ${invoice.doctor_name || 'Self'}</p>
      <p><strong>Status:</strong> ${reports.every(r => r.status === 'VERIFIED') ? 'VERIFIED' : 'COMPLETED'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Test Name</th>
        <th>Sample ID</th>
        <th>Result</th>
        <th>Normal Range</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody>
      ${reports.map(report => `
        <tr>
          <td>${report.test_name} (${report.test_code})</td>
          <td>${report.sample_id || '-'}</td>
          <td class="${report.is_abnormal ? 'abnormal' : ''}">${report.result_value}</td>
          <td>${report[normalRangeKey] || 'N/A'}</td>
          <td>${report.unit || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div class="signatures">
      <div class="signature">
        <p>${reports[0]?.technician_name || 'Technician'}<br>Lab Technician</p>
      </div>
      <div class="signature">
        <p>${reports[0]?.pathologist_name || 'Pathologist'}<br>Pathologist</p>
      </div>
    </div>
    <div class="qr-code">
      <img src="${qrCodeUrl}" alt="QR Code">
      <p>Scan to verify</p>
    </div>
  </div>
</body>
</html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    // Save PDF (in production, upload to S3/Cloud Storage)
    const fileName = `report_${invoiceId}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    // Ensure uploads directory exists
    await fs.mkdir(path.join(__dirname, '../uploads'), { recursive: true });
    await fs.writeFile(filePath, pdfBuffer);

    // Update report with PDF URL
    const pdfUrl = `/uploads/${fileName}`;
    await query(
      'UPDATE reports SET report_pdf_url = $1 WHERE invoice_id = $2',
      [pdfUrl, invoiceId]
    );

    return { pdfUrl, fileName, pdfBuffer };

  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};

/**
 * Generate Report PDF from report data object (simpler version)
 */
const generateReportPDFFromData = async (reportData) => {
  try {
    // Generate HTML for the report
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 30px; }
    .header { text-align: center; border-bottom: 3px solid #2c3e50; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { color: #2c3e50; font-size: 28px; margin-bottom: 5px; }
    .header p { color: #555; font-size: 13px; margin: 3px 0; }
    .report-title { background: #34495e; color: white; padding: 10px; text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px; }
    .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
    .info-item { margin: 8px 0; font-size: 13px; }
    .info-item strong { color: #2c3e50; display: inline-block; width: 120px; }
    .test-result { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
    .test-header { background: #ecf0f1; padding: 10px; margin: -15px -15px 15px -15px; border-radius: 5px 5px 0 0; }
    .test-header h3 { color: #2c3e50; font-size: 16px; }
    .test-code { color: #7f8c8d; font-size: 12px; margin-left: 10px; }
    .result-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 10px 0; font-size: 13px; }
    .result-label { color: #7f8c8d; font-weight: 600; }
    .result-value { color: #2c3e50; font-weight: bold; font-size: 15px; }
    .result-value.abnormal { color: #e74c3c; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; }
    .signatures { display: flex; justify-content: space-around; margin-top: 50px; }
    .signature { text-align: center; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin: 0 auto; padding-top: 8px; margin-top: 60px; }
    .signature p { font-size: 12px; color: #555; }
    .report-footer { text-align: center; margin-top: 30px; font-size: 11px; color: #7f8c8d; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportData.lab_name || 'Laboratory'}</h1>
    <p>${reportData.lab_address || ''}</p>
    <p>Phone: ${reportData.lab_phone || ''} | Email: ${reportData.lab_email || ''}</p>
  </div>

  <div class="report-title">PATHOLOGY REPORT</div>

  <div class="patient-info">
    <div>
      <div class="info-item"><strong>Patient Name:</strong> ${reportData.patient_name}</div>
      <div class="info-item"><strong>UHID:</strong> ${reportData.uhid}</div>
      <div class="info-item"><strong>Age/Gender:</strong> ${reportData.age} Years / ${reportData.gender}</div>
      <div class="info-item"><strong>Phone:</strong> ${reportData.phone || 'N/A'}</div>
    </div>
    <div>
      <div class="info-item"><strong>Invoice No:</strong> ${reportData.invoice_number}</div>
      <div class="info-item"><strong>Sample Date:</strong> ${new Date(reportData.sample_date).toLocaleDateString()}</div>
      <div class="info-item"><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div class="info-item"><strong>Status:</strong> VERIFIED</div>
    </div>
  </div>

  <div class="test-result">
    <div class="test-header">
      <h3>${reportData.test_name}<span class="test-code">(${reportData.test_code})</span></h3>
      <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">Sample ID: <strong>${reportData.sample_id || '-'}</strong></div>
    </div>
    
    <div class="result-row">
      <div>
        <div class="result-label">Result Value</div>
        <div class="result-value ${reportData.is_abnormal ? 'abnormal' : ''}">
          ${reportData.result_value || 'N/A'}
        </div>
      </div>
      <div>
        <div class="result-label">Normal Range</div>
        <div class="result-value">
          ${reportData.gender === 'Male' ? reportData.normal_range_male : reportData.normal_range_female || 'N/A'}
        </div>
      </div>
      <div>
        <div class="result-label">Unit</div>
        <div class="result-value">${reportData.unit || 'N/A'}</div>
      </div>
    </div>

    ${reportData.comments ? `
      <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 3px solid #ffc107;">
        <strong>Comments:</strong> ${reportData.comments}
      </div>
    ` : ''}

    ${reportData.is_abnormal ? `
      <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border-left: 3px solid #e74c3c; color: #721c24;">
        <strong>⚠️ Abnormal Result:</strong> This result is outside the normal range. Please consult with your physician.
      </div>
    ` : ''}
  </div>

  <div class="footer">
    <div class="signatures">
      <div class="signature">
        <div class="signature-line">
          <p><strong>${reportData.technician_name || 'Lab Technician'}</strong></p>
          <p>Lab Technician</p>
        </div>
      </div>
      <div class="signature">
        <div class="signature-line">
          <p><strong>${reportData.pathologist_name || 'Pathologist'}</strong></p>
          <p>Pathologist</p>
        </div>
      </div>
    </div>
  </div>

  <div class="report-footer">
    <p>This is a computer-generated report and is valid without signature.</p>
    <p>Report generated on ${new Date().toLocaleString()}</p>
    <p>Invoice: ${reportData.invoice_number} | UHID: ${reportData.uhid}</p>
  </div>
</body>
</html>
        `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();

    return pdfBuffer;

  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }

};

/**
 * Generate Invoice PDF
 */
const generateInvoicePDF = async (invoiceData) => {
  try {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica', Arial, sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .lab-info h1 { margin: 0 0 5px 0; color: #2c3e50; font-size: 24px; }
    .lab-info p { margin: 2px 0; font-size: 13px; color: #666; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { margin: 0; color: #34495e; font-size: 28px; text-transform: uppercase; }
    .invoice-title p { margin: 5px 0 0; color: #7f8c8d; }
    
    .bill-to { margin-bottom: 30px; display: flex; justify-content: space-between; }
    .patient-details h3 { font-size: 14px; text-transform: uppercase; color: #95a5a6; margin-bottom: 10px; }
    .patient-details p { margin: 3px 0; font-size: 14px; }
    .invoice-meta p { margin: 3px 0; font-size: 14px; text-align: right; }
    .invoice-meta strong { display: inline-block; width: 100px; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8f9fa; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #7f8c8d; border-bottom: 2px solid #eee; }
    td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
    td.amount { text-align: right; }
    
    .totals { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 10px; font-size: 14px; }
    .total-row.final { font-weight: bold; font-size: 16px; border-top: 2px solid #333; margin-top: 10px; padding-top: 15px; }
    
    .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #95a5a6; padding-top: 20px; border-top: 1px solid #eee; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .status-paid { background: #d4edda; color: #155724; }
    .status-pending { background: #f8d7da; color: #721c24; }
    .status-partial { background: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <div class="header">
    <div class="lab-info">
      <h1>${invoiceData.lab_name || 'Laboratory Name'}</h1>
      <p>${invoiceData.lab_address || ''}</p>
      <p>Phone: ${invoiceData.lab_phone || ''} | Email: ${invoiceData.lab_email || ''}</p>
      <p>GSTIN: ${invoiceData.gst_number || ''}</p>
    </div>
    <div class="invoice-title">
      <h2>INVOICE</h2>
      <p>#${invoiceData.invoice_number}</p>
      <div style="margin-top: 10px;">
        <span class="status-badge status-${invoiceData.payment_status.toLowerCase()}">${invoiceData.payment_status}</span>
      </div>
    </div>
  </div>

  <div class="bill-to">
    <div class="patient-details">
      <h3>Bill To:</h3>
      <p><strong>${invoiceData.patient_name}</strong></p>
      <p>UHID: ${invoiceData.uhid}</p>
      <p>Age/Gender: ${invoiceData.age} / ${invoiceData.gender}</p>
      <p>Phone: ${invoiceData.phone || 'N/A'}</p>
      <p>Address: ${invoiceData.address || 'N/A'}</p>
    </div>
    <div class="invoice-meta">
      <p><strong>Date:</strong> ${new Date(invoiceData.created_at).toLocaleDateString()}</p>
      <p><strong>Ref Doctor:</strong> ${invoiceData.doctor_name || 'Self'}</p>
      <p><strong>Payment Mode:</strong> ${invoiceData.payment_mode}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 40%;">Test Description</th>
        <th style="width: 15%;">Code</th>
        <th style="width: 20%;">Sample ID</th>
        <th class="amount" style="width: 20%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceData.items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.test_name}</td>
          <td>${item.test_code}</td>
          <td>${item.sample_id || '-'}</td>
          <td class="amount">₹${parseFloat(item.price).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>₹${parseFloat(invoiceData.total_amount).toFixed(2)}</span>
    </div>
    ${parseFloat(invoiceData.tax_amount) > 0 ? `
    <div class="total-row">
      <span>CGST (${(parseFloat(invoiceData.tax_amount) / parseFloat(invoiceData.total_amount) * 50).toFixed(1)}%):</span>
      <span>₹${(parseFloat(invoiceData.tax_amount) / 2).toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>SGST (${(parseFloat(invoiceData.tax_amount) / parseFloat(invoiceData.total_amount) * 50).toFixed(1)}%):</span>
      <span>₹${(parseFloat(invoiceData.tax_amount) / 2).toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="total-row">
      <span>Discount:</span>
      <span>-₹${parseFloat(invoiceData.discount_amount).toFixed(2)}</span>
    </div>
    <div class="total-row final">
      <span>Net Amount:</span>
      <span>₹${parseFloat(invoiceData.net_amount).toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Amount Paid:</span>
      <span>₹${parseFloat(invoiceData.paid_amount).toFixed(2)}</span>
    </div>
    <div class="total-row" style="color: ${invoiceData.balance_amount > 0 ? '#e74c3c' : '#27ae60'}; font-weight: bold;">
      <span>Balance Due:</span>
      <span>₹${parseFloat(invoiceData.balance_amount).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing our services!</p>
    <p>This is a computer generated invoice.</p>
  </div>
</body>
</html>
        `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    return pdfBuffer;

  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    throw error;
  }
};

module.exports = {
  generateReportPDF,
  generateReportPDFFromData,
  generateInvoicePDF
};
