// src/app/api/attendance/history/route.js
// Get attendance history with filters and logs
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const stationId = searchParams.get('station_id');
    const employeeId = searchParams.get('employee_id');
    const markedById = searchParams.get('marked_by');

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUserId = decoded.userId || decoded.id;

    // Get current user's role and station assignment
    const userInfo = await executeQuery(
      `SELECT role, fs_id FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;
    const userFsId = userInfo[0].fs_id || '';

    // Staff (role 1) cannot access
    if (userRole === 1) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    let query = `
      SELECT 
        a.id,
        a.employee_id,
        a.station_id,
        a.attendance_date,
        a.check_in_time,
        a.check_out_time,
        a.status,
        a.remarks,
        a.marked_by,
        a.created_at,
        a.updated_at,
        e.name as employee_name,
        e.emp_code as employee_code,
        e.role as employee_role,
        fs.station_name,
        marked_by_user.name as marked_by_name,
        marked_by_user.emp_code as marked_by_code,
        marked_by_user.role as marked_by_role,
        CASE 
          WHEN marked_by_user.role = 5 THEN 'Admin'
          WHEN marked_by_user.role = 4 THEN 'Accountant'
          WHEN marked_by_user.role = 3 THEN 'Team Leader'
          WHEN marked_by_user.role = 2 THEN 'Incharge'
          WHEN marked_by_user.role = 1 THEN 'Staff'
          ELSE 'Unknown'
        END as marked_by_role_name
      FROM attendance a
      INNER JOIN employee_profile e ON a.employee_id = e.id
      INNER JOIN filling_stations fs ON a.station_id = fs.id
      LEFT JOIN employee_profile marked_by_user ON a.marked_by = marked_by_user.id
      WHERE 1=1
    `;

    const params = [];

    // Incharge (role 2) - can only see their station's staff
    if (userRole === 2) {
      if (!userFsId) {
        return NextResponse.json(
          { success: false, error: 'No station assigned to user' },
          { status: 400 }
        );
      }

      const stationIds = userFsId.toString().split(',').map(id => id.trim()).filter(id => id);
      
      if (stationIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid station assigned' },
          { status: 400 }
        );
      }

      query += ` AND a.station_id IN (${stationIds.map(() => '?').join(',')})`;
      query += ` AND e.role = 1`; // Only staff
      params.push(...stationIds);
    }

    // Team Leader (role 3) and Accountant (role 4) - can see all stations they're assigned to
    if (userRole === 3 || userRole === 4) {
      if (userFsId) {
        const stationIds = userFsId.toString().split(',').map(id => id.trim()).filter(id => id);
        if (stationIds.length > 0) {
          query += ` AND a.station_id IN (${stationIds.map(() => '?').join(',')})`;
          params.push(...stationIds);
        }
      }
    }

    // Admin (role 5) - can see all (no station filter)

    // Date filters
    if (startDate) {
      query += ` AND a.attendance_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND a.attendance_date <= ?`;
      params.push(endDate);
    }

    // Station filter
    if (stationId) {
      // For incharge, verify access
      if (userRole === 2) {
        const stationIds = userFsId.toString().split(',').map(id => id.trim());
        if (!stationIds.includes(stationId.toString())) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this station' },
            { status: 403 }
          );
        }
      }
      query += ` AND a.station_id = ?`;
      params.push(stationId);
    }

    // Employee filter
    if (employeeId) {
      query += ` AND a.employee_id = ?`;
      params.push(employeeId);
    }

    // Marked by filter
    if (markedById) {
      query += ` AND a.marked_by = ?`;
      params.push(markedById);
    }

    query += ` ORDER BY a.attendance_date DESC, a.created_at DESC`;

    const attendanceHistory = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      data: attendanceHistory,
      count: attendanceHistory.length
    });

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

