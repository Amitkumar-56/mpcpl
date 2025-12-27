// src/app/api/voucher-wallet-driver-emp/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// Mock session data
const getSessionData = () => {
  return {
    user_id: 1,
    role: 5, // Admin role
    fs_id: 1
  };
};

export async function GET(request) {
  try {
    console.log('=== Voucher Wallet Driver Emp API Called ===');

    const session = getSessionData();
    const { searchParams } = new URL(request.url);
    const emp_id = searchParams.get('emp_id');
    
    const userId = session.user_id;
    const role = session.role;
    const fs_id = session.fs_id;

    console.log('Session - User ID:', userId, 'Role:', role, 'FS ID:', fs_id);
    console.log('Request emp_id:', emp_id);

    // Check permissions
    const permissionsQuery = `
      SELECT module_name, can_view, can_edit, can_create 
      FROM role_permissions 
      WHERE module_name = 'Vouchers' AND role = ?
    `;
    const permissionsResult = await executeQuery(permissionsQuery, [role]);
    
    if (permissionsResult.length === 0 || permissionsResult[0].can_view !== 1) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let sql = "";
    let params = [];

    // Build query based on role
    if (role == 5 || role == 4 || role == 3) {
      sql = `
        SELECT 
          v.*,
          c.name AS emp_name,
          fs.station_name
        FROM vouchers v
        LEFT JOIN filling_stations fs ON v.station_id = fs.id
        LEFT JOIN employee_profile c ON v.emp_id = c.id
        WHERE 1=1
      `;
    } else {
      const subs = (role == 1) ? ' AND v.created_by = ?' : '';
      sql = `
        SELECT 
          v.*,
          c.name AS emp_name,
          fs.station_name
        FROM vouchers v
        LEFT JOIN filling_stations fs ON v.station_id = fs.id
        LEFT JOIN employee_profile c ON v.emp_id = c.id
        WHERE v.station_id IN (?) ${subs}
      `;
      params = [fs_id];
      if (role == 1) params.push(userId);
    }

    // Filter by employee (MUST have emp_id)
    if (emp_id) {
      sql += ' AND v.emp_id = ?';
      params.push(emp_id);
    } else {
      // If no emp_id provided, return empty
      return NextResponse.json({
        success: true,
        vouchers: [],
        driver_name: null,
        permissions: permissionsResult[0],
        message: 'No employee ID provided'
      });
    }

    // Add ORDER BY
    sql += ' ORDER BY v.voucher_id DESC';

    console.log('Final SQL:', sql);
    console.log('Query Parameters:', params);

    // Execute query
    const result = await executeQuery(sql, params);
    console.log('Query result:', result.length, 'records found');

    // Get driver name
    let driver_name = null;
    if (emp_id) {
      const driverQuery = 'SELECT name FROM employee_profile WHERE id = ?';
      const driverResult = await executeQuery(driverQuery, [emp_id]);
      if (driverResult.length > 0) {
        driver_name = driverResult[0].name;
        console.log('Driver name found:', driver_name);
      }
    }

    return NextResponse.json({
      success: true,
      vouchers: result,
      driver_name: driver_name,
      permissions: permissionsResult[0],
      current_user: { id: userId },
      query_info: {
        role: role,
        emp_id: emp_id,
        records: result.length
      }
    });

  } catch (error) {
    console.error('Error in voucher-wallet-driver-emp API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error: ' + error.message,
        vouchers: [],
        driver_name: null,
        permissions: null
      },
      { status: 500 }
    );
  }
}