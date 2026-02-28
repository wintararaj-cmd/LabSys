/**
 * Commission Calculator Service
 *
 * Business Rules:
 * ─────────────────────────────────────────────────────────────────────────
 * GENERAL / non-MRI departments:
 *   • Referred Doctor  → MANDATORY
 *   • Introducer = blank / absent  → Commission 100% to Doctor
 *   • Introducer = "SELF"          → Commission 100% to Doctor
 *   • Introducer has a value       → Commission 100% to Introducer
 *   • Special: if Dr and Introducer sent equal number of cases
 *              (checked from DB) → Commission split 50/50
 *
 * MRI department:
 *   • Referred Doctor  → MANDATORY
 *   • Introducer = "SELF"      → Commission 100% to Doctor
 *   • Introducer has a value   → Commission split 50/50 Doctor + Introducer
 * ─────────────────────────────────────────────────────────────────────────
 */

const { query } = require('../config/db');

const COMMISSION_MODE = {
    DOCTOR: 'DOCTOR',
    INTRODUCER: 'INTRODUCER',
    SPLIT: 'SPLIT',
    NONE: 'NONE',
};

const MRI_DEPARTMENT = 'MRI';

/**
 * Check if doctor and introducer have sent equal number of cases
 * (within the last 30 days, for the commission-split special case)
 */
const haveSentEqualCases = async (tenantId, doctorId, introducerId) => {
    if (!doctorId || !introducerId) return false;

    const result = await query(
        `SELECT
            SUM(CASE WHEN doctor_id = $2 THEN 1 ELSE 0 END) as doctor_count,
            SUM(CASE WHEN introducer_id = $3 THEN 1 ELSE 0 END) as intro_count
         FROM invoices
         WHERE tenant_id = $1
           AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
        [tenantId, doctorId, introducerId]
    );

    const docCount = parseInt(result.rows[0]?.doctor_count || 0);
    const intCount = parseInt(result.rows[0]?.intro_count || 0);

    // Equal AND non-zero
    return docCount > 0 && docCount === intCount;
};

/**
 * Determine commission mode and calculate amounts
 *
 * @param {object} params
 * @param {string}  params.department      - 'MRI' | 'GENERAL' | etc.
 * @param {number}  params.doctorId        - referring doctor ID (required)
 * @param {number|null} params.introducerId  - introducer doctor ID or null
 * @param {string|null} params.introducerRaw - raw string ('SELF' or empty)
 * @param {number}  params.netAmount       - invoice net amount for commission base
 * @param {number}  params.tenantId        - for equal-case lookup
 * @returns {Promise<{mode, doctorCommission, introducerCommission, doctorId, introducerId, summary}>}
 */
const calculateCommission = async ({
    department = 'GENERAL',
    doctorId,
    introducerId,
    introducerRaw,
    netAmount,
    tenantId,
}) => {
    if (!doctorId) {
        return {
            mode: COMMISSION_MODE.NONE,
            doctorCommission: 0,
            introducerCommission: 0,
            doctorId: null,
            introducerId: null,
            summary: 'Self / No referring doctor — no commission.'
        };
    }

    // Fetch doctor's commission settings
    const docRes = await query(
        'SELECT commission_type, commission_value, commission_percentage FROM doctors WHERE id = $1',
        [doctorId]
    );

    const doctorSettings = docRes.rows[0] || {};
    const commType = doctorSettings.commission_type || 'PERCENTAGE';
    const commVal = parseFloat(doctorSettings.commission_value || doctorSettings.commission_percentage || 0);

    let totalCommission = 0;
    if (commType === 'FIXED') {
        totalCommission = commVal;
    } else {
        totalCommission = (netAmount * commVal) / 100;
    }

    const isSelf = !introducerId && String(introducerRaw || '').trim().toUpperCase() === 'SELF';
    const hasIntro = !!introducerId;
    const isMRI = String(department).toUpperCase() === MRI_DEPARTMENT;

    let mode, doctorCommission, introducerCommission, summary;

    if (isMRI) {
        // MRI Rules
        if (isSelf || !hasIntro) {
            // 100% to Doctor
            mode = COMMISSION_MODE.DOCTOR;
            doctorCommission = totalCommission;
            introducerCommission = 0;
            summary = `MRI — Introducer SELF: 100% commission (₹${totalCommission.toFixed(2)}) to Doctor`;
        } else {
            // Has real introducer → 50/50 split always for MRI
            mode = COMMISSION_MODE.SPLIT;
            doctorCommission = totalCommission / 2;
            introducerCommission = totalCommission / 2;
            summary = `MRI — Introducer present: 50/50 split (₹${doctorCommission.toFixed(2)} each)`;
        }
    } else {
        // GENERAL / other departments
        if (isSelf || !hasIntro) {
            // Introducer is SELF or blank → 100% to Doctor
            mode = COMMISSION_MODE.DOCTOR;
            doctorCommission = totalCommission;
            introducerCommission = 0;
            summary = `Introducer SELF: 100% commission (₹${totalCommission.toFixed(2)}) to Doctor`;
        } else {
            // Has real introducer
            // Check special equal-cases rule
            const equalCases = await haveSentEqualCases(tenantId, doctorId, introducerId);
            if (equalCases) {
                mode = COMMISSION_MODE.SPLIT;
                doctorCommission = totalCommission / 2;
                introducerCommission = totalCommission / 2;
                summary = `Equal referral cases — 50/50 split (₹${doctorCommission.toFixed(2)} each)`;
            } else {
                // Standard: 100% to introducer
                mode = COMMISSION_MODE.INTRODUCER;
                doctorCommission = 0;
                introducerCommission = totalCommission;
                summary = `Introducer present: 100% commission (₹${totalCommission.toFixed(2)}) to Introducer`;
            }
        }
    }

    return {
        mode,
        doctorCommission: parseFloat(doctorCommission.toFixed(2)),
        introducerCommission: parseFloat(introducerCommission.toFixed(2)),
        doctorId,
        introducerId: hasIntro ? introducerId : null,
        totalCommission: parseFloat(totalCommission.toFixed(2)),
        commissionPct: commVal,
        commissionType: commType,
        summary
    };
};

/**
 * Preview commission for frontend (no DB writes)
 */
const previewCommission = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { doctorId, introducerId, introducerRaw, department, netAmount } = req.body;

        if (doctorId === undefined || !netAmount) {
            return res.json({ mode: 'NONE', doctorCommission: 0, introducerCommission: 0, summary: 'Select a doctor to preview commission.' });
        }

        const result = await calculateCommission({
            tenantId,
            department: department || 'GENERAL',
            doctorId: doctorId ? parseInt(doctorId) : null,
            introducerId: introducerId ? parseInt(introducerId) : null,
            introducerRaw: introducerRaw || '',
            netAmount: parseFloat(netAmount)
        });

        res.json(result);
    } catch (err) {
        console.error('Commission preview error:', err);
        res.status(500).json({ error: 'Commission calculation failed' });
    }
};

module.exports = { calculateCommission, previewCommission, COMMISSION_MODE, MRI_DEPARTMENT };
