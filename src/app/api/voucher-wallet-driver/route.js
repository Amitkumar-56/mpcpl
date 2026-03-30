// src/app/api/voucher-wallet-driver/route.js
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
  let connection = null;
  try {
    console.log('=== Voucher Wallet Driver API Called ===');

    // TEMPORARY: Use mock session data (replace with actual auth later)
    const session = {
      user_id: 1,
      role: 5, // Change this to test different roles: 5=Admin, 4=Manager, 3=Supervisor, 2=Operator, 1=User
      fs_id: 1 // Filling station ID
    };

    const { searchParams } = new URL(request.url);
    const emp_id = searchParams.get('emp_id');
    
    const userId = session.user_id;
    const role = session.role;
    const fs_id = session.fs_id;

    console.log('Session - User ID:', userId, 'Role:', role, 'FS ID:', fs_id);
    console.log('Request emp_id:', emp_id);

    // Get a single connection for all queries
    connection = await executeQuery('SELECT 1');

    let sql = "";
    let params = [];

    // Your exact PHP logic converted to Node.js
    if (role == 5 || role == 4 || role == 3) {
      // Admin, Manager, Supervisor - can see all vouchers
      sql = `
        SELECT v.*, c.name AS emp_name, fs.station_name 
        FROM vouchers v
        LEFT JOIN filling_stations fs ON v.station_id = fs.id
        LEFT JOIN employee_profile c ON v.emp_id = c.id
      `;
    } else {
      // Other roles - restricted access
      const subs = (role == 1) ? ' AND v.created_by = ?' : '';
      sql = `
        SELECT v.*, c.name AS emp_name, fs.station_name 
        FROM vouchers v
        LEFT JOIN filling_stations fs ON v.station_id = fs.id
        LEFT JOIN employee_profile c ON v.emp_id = c.id
        WHERE v.station_id IN (?) ${subs}
      `;
      params = [fs_id];
      if (role == 1) params.push(userId);
    }

    // Filter by employee (your exact PHP logic)
    if (emp_id) {
      if (sql.includes('WHERE')) {
        sql += ' AND v.emp_id = ?';
      } else {
        sql += ' WHERE v.emp_id = ?';
      }
      params.push(emp_id);
    }

    // Add ORDER BY (your exact PHP logic)
    sql += ' ORDER BY v.voucher_id DESC';

    console.log('Final SQL:', sql);
    console.log('Query Parameters:', params);

    // Execute query
    const result = await executeQuery(sql, params);
    console.log('Query result:', result.length, 'records found');

    // Get driver name if emp_id is provided (your exact PHP logic)
    let driver_name = null;
    if (emp_id && result.length > 0) {
      // Check if we already have the driver name from the main query
      const driverFromResult = result.find(v => v.emp_name);
      if (driverFromResult) {
        driver_name = driverFromResult.emp_name;
        console.log('Driver name from main query:', driver_name);
      } else {
        // Fallback to separate query only if needed
        const driverQuery = 'SELECT name FROM employee_profile WHERE id = ? LIMIT 1';
        const driverResult = await executeQuery(driverQuery, [emp_id]);
        if (driverResult.length > 0) {
          driver_name = driverResult[0].name;
          console.log('Driver name from separate query:', driver_name);
        }
      }
    }

    // Check permissions from role_permissions table (with fallback)
    let permissions = {
      module_name: 'Vouchers',
      can_view: 1,
      can_edit: 1,
      can_create: 1
    };

    // Only check permissions for non-admin roles
    if (role < 5) {
      const permissionsQuery = `
        SELECT module_name, can_view, can_edit, can_create 
        FROM role_permissions 
        WHERE module_name = 'Vouchers' AND (role = ? OR employee_id = ?)
        LIMIT 1
      `;
      
      const permissionsResult = await executeQuery(permissionsQuery, [role, userId]);
      
      if (permissionsResult.length > 0) {
        permissions = permissionsResult[0];
      }
    }

    console.log('Permissions:', permissions);

    return NextResponse.json({
      success: true,
      vouchers: result,
      driver_name: driver_name,
      permissions: permissions,
      query_info: {
        role: role,
        sql: sql,
        params: params
      }
    });

  } catch (error) {
    console.error('Error in voucher-wallet-driver API:', error);
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
  } finally {
    // Connection is automatically released by executeQuery
    if (connection) {
      // No manual release needed as executeQuery handles it
    }
  }
}