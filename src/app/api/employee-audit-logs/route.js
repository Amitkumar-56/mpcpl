import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const empCode = searchParams.get('emp_code');

    if (!employeeId && !empCode) {
      return NextResponse.json(
        { success: false, error: 'Employee ID or Employee Code is required' },
        { status: 400 }
      );
    }

    // Query audit_log table for employee-related actions
    let query = '';
    let params = [];

    if (employeeId) {
      // First get the employee's emp_code to match properly
      const empRows = await executeQuery(
        'SELECT emp_code FROM employee_profile WHERE id = ? LIMIT 1',
        [employeeId]
      );
      const empCodeFromDb = empRows.length > 0 ? empRows[0].emp_code : null;
      
      if (empCodeFromDb) {
        query = `
          SELECT 
            al.*,
            COALESCE(ep.name, al.user_name) AS user_display_name
          FROM audit_log al
          LEFT JOIN employee_profile ep ON al.user_id = ep.id
          WHERE al.record_type = 'employee' 
            AND (al.record_id = ? OR al.unique_code = ?)
          ORDER BY al.created_at DESC, al.action_date DESC, al.action_time DESC
          LIMIT 100
        `;
        params = [employeeId, empCodeFromDb];
      } else {
        query = `
          SELECT 
            al.*,
            COALESCE(ep.name, al.user_name) AS user_display_name
          FROM audit_log al
          LEFT JOIN employee_profile ep ON al.user_id = ep.id
          WHERE al.record_type = 'employee' 
            AND al.record_id = ?
          ORDER BY al.created_at DESC, al.action_date DESC, al.action_time DESC
          LIMIT 100
        `;
        params = [employeeId];
      }
    } else if (empCode) {
      query = `
        SELECT 
          al.*,
          COALESCE(ep.name, al.user_name) AS user_display_name
        FROM audit_log al
        LEFT JOIN employee_profile ep ON al.user_id = ep.id
        WHERE al.record_type = 'employee' 
          AND al.unique_code = ?
        ORDER BY al.created_at DESC, al.action_date DESC, al.action_time DESC
        LIMIT 100
      `;
      params = [empCode];
    }

    const logs = await executeQuery(query, params);

    // Parse JSON values and enhance with role names
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
        oldValue = log.old_value;
        newValue = log.new_value;
      }

      // Extract creator/editor info from new_value or user_id
      const creatorId = newValue?.created_by_employee_id || newValue?.edited_by_employee_id || log.user_id;
      const creatorName = newValue?.created_by_name || newValue?.edited_by_name || log.user_display_name || (creatorId ? `Employee ID: ${creatorId}` : null);
      const creatorRole = newValue?.created_by_role || newValue?.edited_by_role || null;
      const creatorRoleName = creatorRole ? roleNames[creatorRole] || 'Unknown' : null;

      // Extract employee info
      const empId = newValue?.employee_id || oldValue?.employee_id;
      const empRole = newValue?.role || oldValue?.role;
      const empRoleName = empRole ? roleNames[empRole] || 'Unknown' : null;

      return {
        ...log,
        user_name: log.user_display_name || log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : null),
        old_value: oldValue,
        new_value: newValue,
        creator_info: {
          id: creatorId || log.user_id,
          name: creatorName,
          role: creatorRole,
          role_name: creatorRoleName
        },
        employee_info: {
          id: empId,
          role: empRole,
          role_name: empRoleName
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: logsWithParsedValues
    });

  } catch (error) {
    console.error('Error fetching employee audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

