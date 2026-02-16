const path = require('path');
const pdfService = require(path.join(__dirname, 'services', 'pdfService'));
const fs = require('fs');


const mockInvoiceData = {
    invoice_number: 'INV/2602/0001',
    created_at: new Date().toISOString(),
    payment_status: 'PENDING',
    payment_mode: 'CASH',
    patient_name: 'Test Patient',
    uhid: 'UHID123',
    age: 30,
    gender: 'Male',
    phone: '1234567890',
    address: '123 Test St',
    doctor_name: 'Dr. Test',
    lab_name: 'Test Lab',
    lab_address: 'Lab Address',
    lab_phone: '9876543210',
    lab_email: 'lab@test.com',
    gst_number: 'GST123',
    total_amount: '1000.00',
    discount_amount: '100.00',
    tax_amount: '50.00',
    net_amount: '950.00',
    paid_amount: '0.00',
    balance_amount: '950.00',
    items: [
        { test_name: 'Complete Blood Count', test_code: 'CBC', price: '500.00' },
        { test_name: 'Lipid Profile', test_code: 'LIPID', price: '500.00' }
    ]
};

async function testInvoicePdf() {
    console.log('Testing Invoice PDF generation...');
    try {
        const buffer = await pdfService.generateInvoicePDF(mockInvoiceData);
        console.log('PDF generated successfully. Length:', buffer.length);
        fs.writeFileSync(path.join(__dirname, 'test_invoice.pdf'), buffer);
        console.log('Saved to test_invoice.pdf');
    } catch (error) {
        console.error('Test FAILED:', error);
    }
}

testInvoicePdf();
