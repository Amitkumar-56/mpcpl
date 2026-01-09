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
      const recordId = parseInt(searchParams.get('record_id'));
      if (!isNaN(recordId)) {
        conditions.push('record_id = ?');
        params.push(recordId);
      }
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
    // ✅ FIX: Always fetch employee name from employee_profile using user_id, even if user_name is 'System'
    const query = `
      SELECT 
        al.*,
        COALESCE(ep.name, c.name, al.user_name) AS user_display_name,
        ep.name AS employee_name,
        ep.id AS employee_profile_id,
        al.user_id AS audit_user_id
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

    // ✅ FIX: Get ALL unique user_ids from logs and fetch their names from employee_profile
    // This ensures all logs get proper employee names, even if JOIN failed
    const allUserIds = logs
      .map(log => log.user_id)
      .filter(id => id !== null && id !== undefined) // Remove nulls/undefined
      .filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
    
    const employeeNamesMap = new Map();
    if (allUserIds.length > 0) {
      try {
        console.log(`🔍 [AuditLogs API] Fetching employee names for ${allUserIds.length} unique user IDs`);
        const placeholders = allUserIds.map(() => '?').join(',');
        const employeeQuery = `SELECT id, name FROM employee_profile WHERE id IN (${placeholders})`;
        const employees = await executeQuery(employeeQuery, allUserIds);
        console.log(`✅ [AuditLogs API] Found ${employees.length} employees from employee_profile table`);
        employees.forEach(emp => {
          if (emp.name && emp.id) {
            employeeNamesMap.set(emp.id, emp.name);
            console.log(`  - ID: ${emp.id} => Name: ${emp.name}`);
          }
        });
        
        // ✅ FIX: For any user_id not found in batch, fetch individually (forcefully)
        const foundIds = new Set(employees.map(e => e.id));
        const missingIds = allUserIds.filter(id => !foundIds.has(id));
        if (missingIds.length > 0) {
          console.log(`🔍 [AuditLogs API] Forcefully fetching ${missingIds.length} missing employee names individually`);
          for (const userId of missingIds) {
            try {
              const directQuery = await executeQuery(
                `SELECT id, name FROM employee_profile WHERE id = ?`,
                [userId]
              );
              if (directQuery.length > 0 && directQuery[0].name) {
                employeeNamesMap.set(userId, directQuery[0].name);
                console.log(`✅ [AuditLogs API] Forcefully fetched: ID ${userId} => ${directQuery[0].name}`);
              }
            } catch (err) {
              console.error(`❌ [AuditLogs API] Error fetching name for ID ${userId}:`, err);
            }
          }
        }
      } catch (err) {
        console.error('❌ [AuditLogs API] Error fetching employee names:', err);
      }
    }
    
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
          name: newValue.created_by_name || newValue.edited_by_name || log.user_display_name || (creatorId ? `Employee ID: ${creatorId}` : null),
          role: creatorRole,
          role_name: creatorRole ? roleNames[creatorRole] || 'Unknown' : null
        };
      }
      
      // ✅ FIX: ALWAYS use name from employee_profile based on user_id (forcefully)
      // This ensures we always get the correct name from employee_profile table
      let displayUserName = null;
      
      // Step 1: If we have user_id, ALWAYS use name from employeeNamesMap (from employee_profile)
      // This map is populated from employee_profile table, so it's the source of truth
      if (log.user_id) {
        const fetchedName = employeeNamesMap.get(log.user_id);
        if (fetchedName) {
          displayUserName = fetchedName;
        }
      }
      
      // Step 2: If still not found, try employee_name from JOIN
      if (!displayUserName && log.employee_name) {
        // Only use if it's a valid name (not System, Unknown User, etc.)
        if (log.employee_name !== 'System' && 
            log.employee_name !== 'Unknown User' &&
            !log.employee_name.startsWith('Employee ID:')) {
          displayUserName = log.employee_name;
        }
      }
      
      // Step 3: Try user_display_name (from COALESCE)
      if (!displayUserName && log.user_display_name) {
        if (log.user_display_name !== 'System' && 
            log.user_display_name !== 'Unknown User' &&
            !log.user_display_name.startsWith('Employee ID:')) {
          displayUserName = log.user_display_name;
        }
      }
      
      // Step 4: Try stored user_name (only if valid)
      if (!displayUserName && log.user_name) {
        if (log.user_name !== 'System' && 
            log.user_name !== 'Unknown User' &&
            !log.user_name.startsWith('Employee ID:')) {
          displayUserName = log.user_name;
        }
      }
      
      // Step 5: Try to get from newValue (might have created_by_name or edited_by_name)
      if (!displayUserName && newValue) {
        displayUserName = newValue.created_by_name || newValue.edited_by_name || newValue.user_name;
      }
      
      // Step 6: Try from old_value
      if (!displayUserName && oldValue) {
        displayUserName = oldValue.created_by_name || oldValue.edited_by_name || oldValue.user_name;
      }
      
      // Step 7: Final fallback - if we have user_id, show ID format
      if (!displayUserName && log.user_id) {
        displayUserName = `Employee ID: ${log.user_id}`;
        console.warn(`⚠️ [AuditLogs API] Employee not found in employee_profile for user_id ${log.user_id}`);
      }
      
      // Step 8: Last resort - show user_id if available, otherwise empty
      if (!displayUserName) {
        if (log.user_id) {
          displayUserName = `Employee ID: ${log.user_id}`;
        } else {
          displayUserName = ''; // Empty instead of 'Unknown User'
        }
      }
      
      return {
        ...log,
        user_name: displayUserName || (log.user_id ? `Employee ID: ${log.user_id}` : ''),
        user_display_name: displayUserName || (log.user_id ? `Employee ID: ${log.user_id}` : ''), // Ensure both fields have the correct name
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

