// src/lib/entityLogs.js - Entity-specific logs similar to filling_logs
import { executeQuery } from './db';

/**
 * Create entity-specific log entry (similar to filling_logs pattern)
 * This creates logs for customers, employees, stations, products, vouchers, etc.
 * 
 * @param {Object} params - Log parameters
 * @param {string} params.entityType - Type of entity: 'customer', 'employee', 'station', 'product', 'voucher', etc.
 * @param {string|number} params.entityId - ID of the entity record
 * @param {number} params.createdBy - User ID who created the record
 * @param {string} params.createdDate - Date/time when created (format: 'YYYY-MM-DD HH:mm:ss')
 * @param {number} params.processedBy - Optional: User ID who processed (for vouchers, etc.)
 * @param {string} params.processedDate - Optional: Date when processed
 * @param {number} params.completedBy - Optional: User ID who completed
 * @param {string} params.completedDate - Optional: Date when completed
 * @param {number} params.updatedBy - Optional: User ID who updated/edited
 * @param {string} params.updatedDate - Optional: Date when updated/edited
 */
export async function createEntityLog({
  entityType,
  entityId,
  createdBy = null,
  createdDate = null,
  processedBy = null,
  processedDate = null,
  completedBy = null,
  completedDate = null,
  updatedBy = null,
  updatedDate = null
}) {
  try {
    // Map entity types to log table names
    const logTableMap = {
      'customer': 'customer_logs',
      'employee': 'employee_logs',
      'station': 'station_logs',
      'product': 'product_logs',
      'voucher': 'voucher_logs',
      'stock': 'stock_logs',
      'supplier': 'supplier_logs',
      'retailer': 'retailer_logs',
      'agent': 'agent_logs'
    };

    const tableName = logTableMap[entityType] || `${entityType}_logs`;

    // Get current date/time if not provided
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // Ensure log table exists with structure similar to filling_logs
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ${entityType}_id VARCHAR(100) NOT NULL COMMENT 'ID of the entity record',
        created_by INT COMMENT 'User ID who created',
        created_date DATETIME COMMENT 'Date when created',
        processed_by INT COMMENT 'User ID who processed',
        processed_date DATETIME COMMENT 'Date when processed',
        completed_by INT COMMENT 'User ID who completed',
        completed_date DATETIME COMMENT 'Date when completed',
        updated_by INT COMMENT 'User ID who updated/edited',
        updated_date DATETIME COMMENT 'Date when updated/edited',
        cancelled_by INT COMMENT 'User ID who cancelled',
        cancelled_date DATETIME COMMENT 'Date when cancelled',
        INDEX idx_entity_id (${entityType}_id),
        INDEX idx_created_by (created_by),
        INDEX idx_created_date (created_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Check if log already exists for this entity ID
    const checkQuery = `SELECT id FROM ${tableName} WHERE ${entityType}_id = ? ORDER BY created_date ASC, id ASC LIMIT 1`;
    const existingLog = await executeQuery(checkQuery, [String(entityId)]);

    if (existingLog.length === 0) {
      // Create new log entry
      const insertQuery = `
        INSERT INTO ${tableName} (
          ${entityType}_id, created_by, created_date,
          processed_by, processed_date,
          completed_by, completed_date,
          updated_by, updated_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await executeQuery(insertQuery, [
        String(entityId),
        createdBy,
        createdDate || currentDateTime,
        processedBy || null,
        processedDate || null,
        completedBy || null,
        completedDate || null,
        updatedBy || null,
        updatedDate || null
      ]);

      console.log(`✅ ${entityType} log created:`, {
        entity_type: entityType,
        entity_id: entityId,
        created_by: createdBy,
        created_date: createdDate || currentDateTime
      });
    } else {
      // Update existing log entry if update fields provided
      if (updatedBy || updatedDate) {
        const updateFields = [];
        const updateValues = [];

        if (updatedBy) {
          updateFields.push('updated_by = ?');
          updateValues.push(updatedBy);
        }
        if (updatedDate) {
          updateFields.push('updated_date = ?');
          updateValues.push(updatedDate);
        }
        if (processedBy) {
          updateFields.push('processed_by = ?');
          updateValues.push(processedBy);
        }
        if (processedDate) {
          updateFields.push('processed_date = ?');
          updateValues.push(processedDate);
        }
        if (completedBy) {
          updateFields.push('completed_by = ?');
          updateValues.push(completedBy);
        }
        if (completedDate) {
          updateFields.push('completed_date = ?');
          updateValues.push(completedDate);
        }

        if (updateFields.length > 0) {
          updateValues.push(String(entityId));
          const updateQuery = `
            UPDATE ${tableName} 
            SET ${updateFields.join(', ')} 
            WHERE ${entityType}_id = ?
          `;
          await executeQuery(updateQuery, updateValues);
          console.log(`✅ ${entityType} log updated:`, {
            entity_type: entityType,
            entity_id: entityId,
            updates: updateFields
          });
        }
      } else {
        console.log(`⚠️ ${entityType} log already exists, no updates provided:`, entityId);
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Error creating ${entityType} log:`, error);
    // Don't throw error - log creation should not break main operations
    return { success: false, error: error.message };
  }
}

