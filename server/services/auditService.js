const { query } = require('../config/db');

/**
 * Log an audit event securely
 * 
 * @param {Object} params
 * @param {Number} params.tenantId - ID of the tenant
 * @param {Number} params.userId - ID of the user performing the action
 * @param {String} params.action - CREATE, UPDATE, DELETE, VERIFY, etc.
 * @param {String} params.entityType - INVOICE, PATIENT, TEST, REPORT, USER, etc.
 * @param {String|Number} params.entityId - ID of the modified entity
 * @param {Object} [params.oldValues] - Previous field values (optional)
 * @param {Object} [params.newValues] - New field values (optional)
 * @param {String} [params.details] - Free-text details (optional)
 * @param {String} [params.ipAddress] - IP of the user (optional)
 */
const logAuditEvent = async ({
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    details = '',
    ipAddress = null
}) => {
    try {
        if (!tenantId || !action || !entityType) {
            console.warn('[Audit] Missing required fields for audit log', { tenantId, action, entityType });
            return;
        }

        await query(
            `INSERT INTO audit_logs 
            (tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, details, ip_address) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                tenantId,
                userId || null,
                action.toUpperCase(),
                entityType.toUpperCase(),
                entityId ? String(entityId) : null,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                details,
                ipAddress
            ]
        );
    } catch (error) {
        // Do not throw the error to prevent stopping the main business logic
        console.error('[Audit Service Error] Failed to write audit log:', error);
    }
};

module.exports = {
    logAuditEvent
};
