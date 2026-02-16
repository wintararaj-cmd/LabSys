const net = require('net');
const HL7 = require('hl7-standard');
const { query } = require('../config/db');

/**
 * Machine Integration Service
 * Listens for HL7 messages from lab analyzers (Port 2575)
 */
class MachineIntegrationService {
    constructor(port = 2575) {
        this.port = port;
        this.server = null;
    }

    start() {
        this.server = net.createServer((socket) => {
            console.log(`[MachineIntegration] New connection from ${socket.remoteAddress}`);

            socket.on('data', async (data) => {
                try {
                    const message = data.toString();
                    console.log(`[MachineIntegration] Received data: ${message.substring(0, 100)}...`);

                    // 1. Parse HL7 Message
                    const hl7 = new HL7(message);
                    hl7.transform();

                    // Extract Sample ID (Barcode) - Usually in OBR-2 or OBR-3
                    // Also check ORC-2 if OBR is missing
                    const sampleId = hl7.get('OBR.2') || hl7.get('OBR.3') || hl7.get('ORC.2') || patientUHID;

                    for (const obx of segments) {
                        const testIdentifier = obx['OBX.3']['OBX.3.1'] || obx['OBX.3'];
                        const resultValue = obx['OBX.5']['OBX.5.1'] || obx['OBX.5'];

                        if (testIdentifier && resultValue) {
                            await this.processResult(sampleId, patientUHID, testIdentifier, resultValue);
                        }
                    }

                    // 2. Send Acknowledgement (ACK) - Required by HL7 protocol
                    const ack = hl7.createAcknowledgement('AA');
                    socket.write(ack.toString());

                } catch (error) {
                    console.error('[MachineIntegration] Error parsing message:', error);
                }
            });

            socket.on('error', (err) => {
                console.error('[MachineIntegration] Socket error:', err);
            });
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 Machine Integration Service listening on TCP port ${this.port} (HL7)`);
        });
    }

    /**
     * Map machine result to LIMS report
     */
    async processResult(sampleId, uhid, machineTestCode, value) {
        console.log(`[MachineIntegration] Processing: Sample=${sampleId}, Patient=${uhid}, Test=${machineTestCode}, Value=${value}`);

        try {
            // Find report by Sample ID primary, fallback to UHID + Test Code
            let reportQuery = `
                SELECT r.id, r.test_id, r.invoice_id, t.normal_range_male, t.normal_range_female, p.gender
                FROM reports r
                JOIN tests t ON r.test_id = t.id
                JOIN invoices i ON r.invoice_id = i.id
                JOIN patients p ON i.patient_id = p.id
                WHERE r.sample_id = $1
                AND (t.code = $2 OR t.name ILIKE $2)
                AND r.status IN ('PENDING', 'COMPLETED')
                ORDER BY r.created_at DESC
                LIMIT 1
            `;
            let params = [sampleId, machineTestCode];

            let reportResult = await query(reportQuery, params);

            // Fallback to UHID if Sample ID lookup fails
            if (reportResult.rows.length === 0) {
                reportQuery = `
                    SELECT r.id, r.test_id, r.invoice_id, t.normal_range_male, t.normal_range_female, p.gender
                    FROM reports r
                    JOIN tests t ON r.test_id = t.id
                    JOIN invoices i ON r.invoice_id = i.id
                    JOIN patients p ON i.patient_id = p.id
                    WHERE p.uhid = $1 
                    AND (t.code = $2 OR t.name ILIKE $2)
                    AND r.status IN ('PENDING', 'COMPLETED')
                    ORDER BY r.created_at DESC
                    LIMIT 1
                `;
                params = [uhid, machineTestCode];
                reportResult = await query(reportQuery, params);
            }

            if (reportResult.rows.length === 0) {
                console.warn(`[MachineIntegration] No report found for lookup (Sample:${sampleId}, UHID:${uhid}, Test:${machineTestCode})`);
                return;
            }

            const report = reportResult.rows[0];
            const normalRange = report.gender === 'Male' ? report.normal_range_male : report.normal_range_female;

            let isAbnormal = false;
            if (normalRange && value) {
                const rangeMatch = normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
                if (rangeMatch) {
                    const min = parseFloat(rangeMatch[1]);
                    const max = parseFloat(rangeMatch[2]);
                    const numericValue = parseFloat(value);
                    if (!isNaN(numericValue)) {
                        isAbnormal = numericValue < min || numericValue > max;
                    }
                }
            }

            await query(`
                UPDATE reports 
                SET result_value = $1, 
                    is_abnormal = $2, 
                    status = 'COMPLETED',
                    comments = COALESCE(comments, '') || '\n[Auto-synced from analyzer]',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [value, isAbnormal, report.id]);

            console.log(`✅ [MachineIntegration] Successfully updated report ID ${report.id} for Sample ${sampleId}`);

        } catch (error) {
            console.error('[MachineIntegration] Database update error:', error);
        }
    }
}

module.exports = new MachineIntegrationService();
