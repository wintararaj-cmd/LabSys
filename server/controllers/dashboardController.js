const { query } = require('../config/db');
const { getAccountingYearInfo } = require('../utils/dateHelper');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { branchId } = req.query; // Added
        const today = new Date().toISOString().split('T')[0];

        const branchFilter = branchId ? ' AND branch_id = $3' : '';
        const branchParams = branchId ? [tenantId, today, branchId] : [tenantId, today];

        // Today's collection
        const collectionResult = await query(
            `SELECT COALESCE(SUM(paid_amount), 0) as today_collection
       FROM invoices
       WHERE tenant_id = $1 AND DATE(created_at) = $2${branchFilter}`,
            branchParams
        );

        const fy = getAccountingYearInfo();
        // FY Collection
        const fyCollectionResult = await query(
            `SELECT COALESCE(SUM(paid_amount), 0) as fy_collection
       FROM invoices
       WHERE tenant_id = $1 AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $2::date AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $3::date${branchId ? ' AND branch_id = $4' : ''}`,
            branchId ? [tenantId, fy.startDate, fy.endDate, branchId] : [tenantId, fy.startDate, fy.endDate]
        );

        // Today's patients
        const patientsResult = await query(
            `SELECT COUNT(*) as today_patients
       FROM patients
       WHERE tenant_id = $1 AND DATE(created_at) = $2${branchId ? ' AND branch_id = $3' : ''}`,
            branchParams
        );

        // Pending reports
        const pendingReportsResult = await query(
            `SELECT COUNT(*) as pending_reports
       FROM reports r
       JOIN invoices i ON r.invoice_id = i.id
       WHERE i.tenant_id = $1 AND r.status IN ('PENDING', 'COMPLETED')${branchId ? ' AND i.branch_id = $2' : ''}`,
            branchId ? [tenantId, branchId] : [tenantId]
        );

        // Pending payments
        const pendingPaymentsResult = await query(
            `SELECT COALESCE(SUM(balance_amount), 0) as pending_payments
       FROM invoices
       WHERE tenant_id = $1 AND payment_status IN ('PENDING', 'PARTIAL')${branchId ? ' AND branch_id = $2' : ''}`,
            branchId ? [tenantId, branchId] : [tenantId]
        );

        // Low stock items
        const lowStockResult = await query(
            `SELECT COUNT(*) as low_stock_items
       FROM inventory_items
       WHERE tenant_id = $1 AND quantity <= low_stock_threshold${branchId ? ' AND branch_id = $2' : ''}`,
            branchId ? [tenantId, branchId] : [tenantId]
        );

        // Expiring items (within 30 days)
        const expiringItemsResult = await query(
            `SELECT COUNT(*) as expiring_items
       FROM inventory_items
       WHERE tenant_id = $1 AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       AND expiry_date >= CURRENT_DATE${branchId ? ' AND branch_id = $2' : ''}`,
            branchId ? [tenantId, branchId] : [tenantId]
        );

        // Monthly revenue trend (last 6 months)
        const revenueResult = await query(
            `SELECT 
          TO_CHAR(created_at, 'Mon YYYY') as month,
          SUM(paid_amount) as revenue
        FROM invoices
        WHERE tenant_id = $1 
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        ${branchId ? ' AND branch_id = $2' : ''}
        GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) DESC`,
            branchId ? [tenantId, branchId] : [tenantId]
        );

        // Top tests (most ordered)
        const topTestsResult = await query(
            `SELECT t.name, COUNT(*) as count
       FROM invoice_items ii
       JOIN tests t ON ii.test_id = t.id
       JOIN invoices i ON ii.invoice_id = i.id
       WHERE i.tenant_id = $1
       AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'
       ${branchId ? ' AND i.branch_id = $2' : ''}
       GROUP BY t.name
       ORDER BY count DESC
       LIMIT 5`,
            branchId ? [tenantId, branchId] : [tenantId]
        );

        // Daily revenue trend (last 7 days) - real data
        const dailyRevenueResult = await query(
            `SELECT
               TO_CHAR(DATE(created_at), 'Dy') as day,
               DATE(created_at) as date,
               COALESCE(SUM(paid_amount), 0) as revenue,
               COUNT(DISTINCT patient_id) as patients
             FROM invoices
             WHERE tenant_id = $1
             AND created_at >= CURRENT_DATE - INTERVAL '6 days'
             ${branchId ? ' AND branch_id = $2' : ''}
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at) ASC`,
            branchId ? [tenantId, branchId] : [tenantId]
        );

        // Recent activity from audit_logs
        const recentActivityResult = await query(
            `SELECT al.action, al.entity_type, al.entity_id, al.details, al.created_at,
                    u.name as user_name, u.role as user_role
             FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.tenant_id = $1
             ORDER BY al.created_at DESC
             LIMIT 8`,
            [tenantId]
        );

        // Payment mode breakdown for today
        const paymentModeResult = await query(
            `SELECT COALESCE(payment_mode, 'UNKNOWN') as payment_mode,
                    COUNT(*) as count,
                    COALESCE(SUM(paid_amount), 0) as total
             FROM invoices
             WHERE tenant_id = $1 AND DATE(created_at) = $2
             ${branchId ? ' AND branch_id = $3' : ''}
             GROUP BY payment_mode`,
            branchParams
        );

        res.json({
            todayCollection: parseFloat(collectionResult.rows[0].today_collection),
            fyCollection: parseFloat(fyCollectionResult.rows[0].fy_collection),
            accountingYearLabel: fy.displayLabel,
            todayPatients: parseInt(patientsResult.rows[0].today_patients),
            pendingReports: parseInt(pendingReportsResult.rows[0].pending_reports),
            pendingPayments: parseFloat(pendingPaymentsResult.rows[0].pending_payments),
            lowStockItems: parseInt(lowStockResult.rows[0].low_stock_items),
            expiringItems: parseInt(expiringItemsResult.rows[0].expiring_items),
            revenueChart: revenueResult.rows,
            dailyRevenue: dailyRevenueResult.rows,
            topTests: topTestsResult.rows,
            recentActivity: recentActivityResult.rows,
            paymentModeBreakdown: paymentModeResult.rows,
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
};

/**
 * Get monthly analytics
 */
const getMonthlyAnalytics = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { month, year, branchId } = req.query;

        const startDate = `${year}-${month}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const branchFilter = branchId ? ' AND branch_id = $4' : '';
        const params = branchId ? [tenantId, startDate, endDate, branchId] : [tenantId, startDate, endDate];

        // Total revenue
        const revenueResult = await query(
            `SELECT COALESCE(SUM(paid_amount), 0) as total_revenue
       FROM invoices
       WHERE tenant_id = $1 
       AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $2::date AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $3::date${branchFilter}`,
            params
        );

        // Total patients
        const patientsResult = await query(
            `SELECT COUNT(DISTINCT patient_id) as total_patients
       FROM invoices
       WHERE tenant_id = $1 
       AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $2::date AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $3::date${branchFilter}`,
            params
        );

        // Total tests
        const testsResult = await query(
            `SELECT COUNT(*) as total_tests
       FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       WHERE i.tenant_id = $1 
       AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $2::date AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $3::date${branchId ? ' AND i.branch_id = $4' : ''}`,
            params
        );

        // Doctor-wise referrals
        const doctorReferralsResult = await query(
            `SELECT d.name, d.commission_percentage,
              COUNT(*) as referral_count,
              SUM(i.net_amount) as total_business,
              SUM(i.net_amount * d.commission_percentage / 100) as commission_amount
       FROM invoices i
       JOIN doctors d ON i.doctor_id = d.id
       WHERE i.tenant_id = $1 
       AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $2::date AND (i.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $3::date
       ${branchId ? ' AND i.branch_id = $4' : ''}
       GROUP BY d.id, d.name, d.commission_percentage
       ORDER BY total_business DESC`,
            params
        );

        res.json({
            totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
            totalPatients: parseInt(patientsResult.rows[0].total_patients),
            totalTests: parseInt(testsResult.rows[0].total_tests),
            doctorReferrals: doctorReferralsResult.rows,
        });

    } catch (error) {
        console.error('Monthly analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch monthly analytics' });
    }
};

module.exports = {
    getDashboardStats,
    getMonthlyAnalytics,
};
