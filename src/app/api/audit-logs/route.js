// src/app/api/audit-logs/route.js - Universal Audit Log API
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET - Fetch audit logs with filters
 * Query params:
 * - page: Filter by page name
 * - section: Filter by section
 * - user_id: Filter by user ID
 * - action: Filter by action type
 * - record_type: Filter by record type
 * - record_id: Filter by record ID
 * - unique_code: Filter by unique code
 * - from_date: Filter from date (YYYY-MM-DD)
 * - to_date: Filter to date (YYYY-MM-DD)
 * - limit: Limit results (default: 100)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Build WHERE clause based on filters
    const conditions = [];
    const params = [];
    
    if (searchParams.get('page')) {
      conditions.push('page = ?');
      params.push(searchParams.get('page'));
    }
    
    if (searchParams.get('section')) {
      conditions.push('section = ?');
      params.push(searchParams.get('section'));
    }
    
    if (searchParams.get('user_id')) {
      conditions.push('user_id = ?');
      params.push(parseInt(searchParams.get('user_id')));
    }
    
    if (searchParams.get('action')) {
      conditions.push('action = ?');
      params.push(searchParams.get('action'));
    }
    
    if (searchParams.get('record_type')) {
      conditions.push('record_type = ?');
      params.push(searchParams.get('record_type'));
    }
    
    if (searchParams.get('record_id')) {
      conditions.push('record_id = ?');
      params.push(parseInt(searchParams.get('record_id')));
    }
    
    if (searchParams.get('unique_code')) {
      conditions.push('unique_code = ?');
      params.push(searchParams.get('unique_code'));
    }
    
    if (searchParams.get('from_date')) {
      conditions.push('action_date >= ?');
      params.push(searchParams.get('from_date'));
    }
    
    if (searchParams.get('to_date')) {
      conditions.push('action_date <= ?');
      params.push(searchParams.get('to_date'));
    }
    
    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}`
      : '';
    
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = parseInt(searchParams.get('offset')) || 0;
    
    // Ensure table exists
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
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM audit_log ${whereClause}`;
    const countResult = await executeQuery(countQuery, params);
    const total = countResult[0]?.total || 0;
    
    // Get audit logs with user names from both employee_profile and customers tables
    const query = `
      SELECT 
        al.*,
        COALESCE(ep.name, c.name, al.user_name, 'System') AS user_display_name
      FROM audit_log al
      LEFT JOIN employee_profile ep ON al.user_id = ep.id
      LEFT JOIN customers c ON al.user_id = c.id
      ${whereClause}
      ORDER BY al.created_at DESC, al.action_date DESC, al.action_time DESC
      LIMIT ? OFFSET ?
    `;
    
    const logs = await executeQuery(query, [...params, limit, offset]);
    
    // Parse JSON values and enhance with role information
    const roleNames = {
      1: 'Staff',
      2: 'Incharge',
      3: 'Team Leader',
      4: 'Accountant',
      5: 'Admin',
      6: 'Driver'
    };

    const logsWithParsedValues = logs.map(log => {
      let oldValue = null;
      let newValue = null;
      
      try {
        if (log.old_value) {
          oldValue = typeof log.old_value === 'string' 
            ? JSON.parse(log.old_value) 
            : log.old_value;
        }
        if (log.new_value) {
          newValue = typeof log.new_value === 'string' 
            ? JSON.parse(log.new_value) 
            : log.new_value;
        }
      } catch (e) {
        // If parsing fails, use as string
        oldValue = log.old_value;
        newValue = log.new_value;
      }

      // Enhance with creator/editor info for employee records
      let creatorInfo = null;
      if (log.record_type === 'employee' && newValue) {
        const creatorId = newValue.created_by_employee_id || newValue.edited_by_employee_id || log.user_id;
        const creatorRole = newValue.created_by_role || newValue.edited_by_role;
        creatorInfo = {
          id: creatorId,
          name: newValue.created_by_name || newValue.edited_by_name || log.user_display_name || 'System',
          role: creatorRole,
          role_name: creatorRole ? roleNames[creatorRole] || 'Unknown' : null
        };
      }
      
      // Try to get employee name if user_name is 'System' or empty
      let displayUserName = log.user_display_name || log.user_name;
      if ((!displayUserName || displayUserName === 'System') && log.user_id) {
        // Already joined with employee_profile, so user_display_name should have the name
        // But if it's still System, try to get from newValue
        if (newValue && (newValue.created_by_name || newValue.user_name || newValue.edited_by_name)) {
          displayUserName = newValue.created_by_name || newValue.user_name || newValue.edited_by_name;
        }
      }
      
      return {
        ...log,
        user_name: displayUserName || 'Unknown User',
        old_value: oldValue,
        new_value: newValue,
        creator_info: creatorInfo
      };
    });
    
    return NextResponse.json({
      success: true,
      data: logsWithParsedValues,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new audit log entry
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { createAuditLog } = await import('@/lib/auditLog');
    
    const result = await createAuditLog({
      page: body.page,
      uniqueCode: body.uniqueCode || body.unique_code,
      section: body.section,
      userId: body.userId || body.user_id,
      userName: body.userName || body.user_name,
      action: body.action,
      remarks: body.remarks || '',
      oldValue: body.oldValue || body.old_value,
      newValue: body.newValue || body.new_value,
      fieldName: body.fieldName || body.field_name,
      recordType: body.recordType || body.record_type,
      recordId: body.recordId || body.record_id
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Audit log created successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

