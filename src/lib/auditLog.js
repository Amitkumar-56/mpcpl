// src/lib/auditLog.js - Universal Audit Log Utility
import { executeQuery } from './db';

/**
 * Create a comprehensive audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.page - Page name where action occurred
 * @param {string} params.uniqueCode - Unique identifier (ID) of the record
 * @param {string} params.section - Section/module name
 * @param {number} params.userId - User ID who performed the action
 * @param {string} params.userName - User name who performed the action
 * @param {string} params.action - Action type (create, add, delete, edit, approve, reject, etc.)
 * @param {string} params.remarks - Additional remarks/description
 * @param {Object} params.oldValue - Old value (before change) - can be object or string
 * @param {Object} params.newValue - New value (after change) - can be object or string
 * @param {string} params.fieldName - Specific field name that changed (optional)
 * @param {string} params.recordType - Type of record (stock, customer, supplier, etc.)
 * @param {number} params.recordId - Record ID
 */
export async function createAuditLog({
  page,
  uniqueCode,
  section,
  userId,
  userName,
  action,
  remarks = '',
  oldValue = null,
  newValue = null,
  fieldName = null,
  recordType = null,
  recordId = null
}) {
  try {
    // Ensure audit_log table exists with comprehensive structure
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page VARCHAR(255) NOT NULL COMMENT 'Page name where action occurred',
        unique_code VARCHAR(100) NOT NULL COMMENT 'Unique identifier of the record',
        section VARCHAR(255) NOT NULL COMMENT 'Section/module name',
        user_id INT COMMENT 'User ID who performed the action',
        user_name VARCHAR(255) NOT NULL COMMENT 'User name who performed the action',
        action VARCHAR(50) NOT NULL COMMENT 'Action type: create, add, delete, edit, approve, reject',
        remarks TEXT COMMENT 'Additional remarks/description',
        old_value JSON COMMENT 'Old value before change',
        new_value JSON COMMENT 'New value after change',
        field_name VARCHAR(255) COMMENT 'Specific field name that changed',
        record_type VARCHAR(100) COMMENT 'Type of record (stock, customer, supplier, etc.)',
        record_id INT COMMENT 'Record ID',
        action_date DATE NOT NULL COMMENT 'Date of action',
        action_time TIME NOT NULL COMMENT 'Time of action',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_page (page),
        INDEX idx_unique_code (unique_code),
        INDEX idx_section (section),
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_record_type (record_type),
        INDEX idx_record_id (record_id),
        INDEX idx_action_date (action_date),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Get current date and time
    const now = new Date();
    const actionDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const actionTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Convert oldValue and newValue to JSON strings if they are objects
    const oldValueJson = oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null;
    const newValueJson = newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null;

    // Insert audit log entry
    await executeQuery(
      `INSERT INTO audit_log (
        page, unique_code, section, user_id, user_name, action, remarks,
        old_value, new_value, field_name, record_type, record_id,
        action_date, action_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        page || 'Unknown',
        uniqueCode || 'N/A',
        section || 'General',
        userId || null,
        userName || 'System',
        action || 'unknown',
        remarks || '',
        oldValueJson,
        newValueJson,
        fieldName || null,
        recordType || null,
        recordId || null,
        actionDate,
        actionTime
      ]
    );

    return { success: true };
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error - audit logging should not break main operations
    return { success: false, error: error.message };
  }
}

/**
 * Helper function to get user info from token
 * This should be called from API routes with userId and userName passed directly
 * For better performance, get user info in the API route and pass it here
 */
export async function getUserInfoFromToken(token) {
  try {
    if (!token) {
      return { userId: null, userName: 'System' };
    }

    // Import verifyToken
    const { verifyToken } = await import('./auth');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return { userId: null, userName: 'System' };
    }

    // Get user details from database
    const users = await executeQuery(
      `SELECT id, name FROM employee_profile WHERE id = ?`,
      [decoded.userId || decoded.id]
    );

    if (users.length > 0) {
      return {
        userId: users[0].id,
        userName: users[0].name
      };
    }

    return {
      userId: decoded.userId || decoded.id || null,
      userName: decoded.name || 'Unknown User'
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return { userId: null, userName: 'System' };
  }
}

/**
 * Format value changes for display
 */
export function formatValueChange(oldValue, newValue, fieldName = null) {
  if (!oldValue && !newValue) return '';
  
  const oldStr = oldValue ? (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)) : 'N/A';
  const newStr = newValue ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) : 'N/A';
  
  if (fieldName) {
    return `${fieldName}: "${oldStr}" → "${newStr}"`;
  }
  
  return `"${oldStr}" → "${newStr}"`;
}

