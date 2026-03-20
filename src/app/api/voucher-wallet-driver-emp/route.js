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

    // Check permissions - Auto-grant for roles 5,4,3,7
    let permissions = {
      module_name: 'Vouchers',
      can_view: 0,
      can_edit: 0,
      can_create: 0
    };

    // Auto-grant full permissions for admin roles
    if (role == 5 || role == 4 || role == 3 || role == 7) {
      permissions = {
        module_name: 'Vouchers',
        can_view: 1,
        can_edit: 1,
        can_create: 1
      };
      console.log(`Auto-granted full permissions for admin role ${role}`);
    } else {
      // Check role_permissions for other roles
      const permissionsQuery = `
        SELECT module_name, can_view, can_edit, can_create 
        FROM role_permissions 
        WHERE module_name = 'Vouchers' AND role = ?
      `;
      const permissionsResult = await executeQuery(permissionsQuery, [role]);
      
      if (permissionsResult.length > 0) {
        permissions = permissionsResult[0];
      }
    }
    
    if (permissions.can_view !== 1) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let sql = "";
    let params = [];

    // Build query based on role
    if (role == 5 || role == 4 || role == 3 || role == 7) {
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
        permissions: permissions,
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

    // Auto-approve logic: Check if any voucher has been pending for more than 24 hours
    const processedVouchers = result.map(voucher => {
      // If voucher is still pending (status = 0 or null) and created more than 24 hours ago
      if ((voucher.status == 0 || voucher.status == null) && voucher.created_at) {
        const createdDate = new Date(voucher.created_at);
        const now = new Date();
        const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
        
        // Auto-approve after 24 hours
        if (hoursDiff > 24) {
          console.log(`Auto-approving voucher ${voucher.voucher_id} after ${hoursDiff.toFixed(2)} hours`);
          
          // Update voucher status to approved
          executeQuery(
            'UPDATE vouchers SET status = 1, approved_by = ?, approved_at = NOW() WHERE voucher_id = ?',
            ['System Auto-Approve', voucher.voucher_id]
          ).catch(err => console.error('Error auto-approving voucher:', err));
          
          // Return updated voucher
          return {
            ...voucher,
            status: 1,
            approved_by: 'System Auto-Approve',
            approved_at: new Date().toISOString()
          };
        }
      }
      return voucher;
    });

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
      vouchers: processedVouchers,
      driver_name: driver_name,
      permissions: permissions,
      current_user: { id: userId },
      query_info: {
        role: role,
        emp_id: emp_id,
        records: processedVouchers.length
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