// src/app/api/voucher-advance-history/route.js
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
  let connection = null;
  try {
    console.log('=== Voucher Advance History API Called ===');

    // TEMPORARY: Use mock session data (replace with actual auth later)
    const session = {
      user_id: 1,
      role: 5, // Change this to test different roles: 5=Admin, 4=Manager, 3=Supervisor, 2=Operator, 1=User
      fs_id: 1 // Filling station ID
    };

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    
    const userId = session.user_id;
    const role = session.role;
    const fs_id = session.fs_id;

    console.log('Session - User ID:', userId, 'Role:', role, 'FS ID:', fs_id);

    // Get a single connection for all queries
    connection = await executeQuery('SELECT 1');

    let sql = "";
    let params = [];

    // Build query based on role permissions
    if (role == 5 || role == 4 || role == 3) {
      // Admin, Manager, Supervisor - can see all advance records
      sql = `
        SELECT 
          v.voucher_id,
          v.voucher_no,
          v.vehicle_no,
          v.emp_id,
          v.advance,
          v.exp_date,
          c.name AS emp_name,
          c.phone AS emp_phone,
          fs.station_name
        FROM vouchers v
        LEFT JOIN filling_stations fs ON v.station_id = fs.id
        LEFT JOIN employee_profile c ON v.emp_id = c.id
        WHERE v.advance > 0
      `;
    } else {
      // Other roles - restricted access
      const subs = (role == 1) ? ' AND v.created_by = ?' : '';
      sql = `
        SELECT 
          v.voucher_id,
          v.voucher_no,
          v.vehicle_no,
          v.emp_id,
          v.advance,
          v.exp_date,
          c.name AS emp_name,
          c.phone AS emp_phone,
          fs.station_name
        FROM vouchers v
        LEFT JOIN filling_stations fs ON v.station_id = fs.id
        LEFT JOIN employee_profile c ON v.emp_id = c.id
        WHERE v.station_id = ? AND v.advance > 0 ${subs}
      `;
      params = [fs_id];
      if (role == 1) params.push(userId);
    }

    // Add ORDER BY and LIMIT for pagination
    sql += ' ORDER BY v.exp_date DESC LIMIT ' + parseInt(limit) + ' OFFSET ' + parseInt(offset);

    console.log('Final SQL:', sql);
    console.log('Query Parameters:', params);

    // Execute query for paginated results
    const result = await executeQuery(sql, params);
    console.log('Query result:', result.length, 'records found');

    // Get total count for pagination
    let countSql = "";
    let countParams = [];

    if (role == 5 || role == 4 || role == 3) {
      countSql = `
        SELECT COUNT(*) as total
        FROM vouchers v
        WHERE v.advance > 0
      `;
    } else {
      const subs = (role == 1) ? ' AND v.created_by = ?' : '';
      countSql = `
        SELECT COUNT(*) as total
        FROM vouchers v
        WHERE v.station_id = ? AND v.advance > 0 ${subs}
      `;
      countParams = [fs_id];
      if (role == 1) countParams.push(userId);
    }

    const countResult = await executeQuery(countSql, countParams);
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Calculate summary statistics
    let summarySql = "";
    let summaryParams = [];

    if (role == 5 || role == 4 || role == 3) {
      summarySql = `
        SELECT 
          COUNT(*) as total_advances,
          SUM(v.advance) as total_advance_amount,
          AVG(v.advance) as avg_advance_amount,
          MAX(v.advance) as max_advance_amount,
          MIN(v.advance) as min_advance_amount
        FROM vouchers v
        WHERE v.advance > 0
      `;
    } else {
      const subs = (role == 1) ? ' AND v.created_by = ?' : '';
      summarySql = `
        SELECT 
          COUNT(*) as total_advances,
          SUM(v.advance) as total_advance_amount,
          AVG(v.advance) as avg_advance_amount,
          MAX(v.advance) as max_advance_amount,
          MIN(v.advance) as min_advance_amount
        FROM vouchers v
        WHERE v.station_id = ? AND v.advance > 0 ${subs}
      `;
      summaryParams = [fs_id];
      if (role == 1) summaryParams.push(userId);
    }

    const summaryResult = await executeQuery(summarySql, summaryParams);
    const summary = summaryResult[0];

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
      advances: result,
      summary: {
        total_advances: summary.total_advances || 0,
        total_advance_amount: parseFloat(summary.total_advance_amount || 0),
        avg_advance_amount: parseFloat(summary.avg_advance_amount || 0),
        max_advance_amount: parseFloat(summary.max_advance_amount || 0),
        min_advance_amount: parseFloat(summary.min_advance_amount || 0)
      },
      permissions: permissions,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_records: totalRecords,
        limit: limit,
        has_next: page < totalPages,
        has_prev: page > 1
      },
      query_info: {
        role: role,
        sql: sql,
        params: params
      }
    });

  } catch (error) {
    console.error('Error in voucher-advance-history API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error: ' + error.message,
        advances: [],
        summary: null,
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
