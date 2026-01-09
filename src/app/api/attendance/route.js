// src/app/api/attendance/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

// GET - Fetch attendance records with role-based filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const stationId = searchParams.get('station_id');
    const employeeId = searchParams.get('employee_id');

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

    // Role-based access control
    // Role 1 = Staff (cannot see attendance)
    // Role 2 = Incharge (can see only their station's staff)
    // Role 3 = Team Leader (can see their branch team)
    // Role 4 = Accountant (can see all)
    // Role 5 = Admin (can see all)

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
        e.emp_code,
        fs.station_name,
        marked_by_user.name as marked_by_name
      FROM attendance a
      INNER JOIN employee_profile e ON a.employee_id = e.id
      INNER JOIN filling_stations fs ON a.station_id = fs.id
      LEFT JOIN employee_profile marked_by_user ON a.marked_by = marked_by_user.id
      WHERE 1=1
    `;

    const params = [];

    // Staff (role 1) cannot access attendance
    if (userRole === 1) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Staff cannot view attendance.' },
        { status: 403 }
      );
    }

    // Incharge (role 2) - can only see their station's staff (not incharge/admin)
    if (userRole === 2) {
      if (!userFsId) {
        return NextResponse.json(
          { success: false, error: 'No station assigned to user' },
          { status: 400 }
        );
      }

      // Parse fs_id (can be comma-separated)
      const stationIds = userFsId.toString().split(',').map(id => id.trim()).filter(id => id);
      
      if (stationIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid station assigned' },
          { status: 400 }
        );
      }

      // Incharge can only see staff (role 1) from their station
      query += ` AND a.station_id IN (${stationIds.map(() => '?').join(',')})`;
      query += ` AND e.role = 1`; // Only staff, not other incharges
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

    // Date filter
    if (date) {
      query += ` AND a.attendance_date = ?`;
      params.push(date);
    }

    // Station filter (if provided and user has access)
    if (stationId) {
      // For incharge, verify they have access to this station
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

    query += ` ORDER BY a.attendance_date DESC, fs.station_name ASC, e.name ASC`;

    const attendanceRecords = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      data: attendanceRecords,
      count: attendanceRecords.length
    });

  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Mark attendance
export async function POST(request) {
  try {
    const body = await request.json();
    const { employee_id, station_id, attendance_date, check_in_time, check_out_time, status, remarks } = body;

    // Validation
    if (!employee_id || !station_id || !attendance_date) {
      return NextResponse.json(
        { success: false, error: 'Employee ID, Station ID, and Date are required' },
        { status: 400 }
      );
    }

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

    // Staff (role 1) cannot mark attendance
    if (userRole === 1) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Staff cannot mark attendance.' },
        { status: 403 }
      );
    }

    // Incharge (role 2), Team Leader (role 3), Accountant (role 4) - can mark attendance for their assigned stations
    if (userRole === 2 || userRole === 3 || userRole === 4) {
      if (!userFsId) {
        return NextResponse.json(
          { success: false, error: 'No station assigned to user' },
          { status: 400 }
        );
      }

      const stationIds = userFsId.toString().split(',').map(id => id.trim());
      if (!stationIds.includes(station_id.toString())) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You can only mark attendance for your assigned stations.' },
          { status: 403 }
        );
      }

      // For Incharge: only staff (role 1) from their station
      // For Team Leader and Accountant: can mark for any employee from their assigned stations
      if (userRole === 2) {
        // Verify employee is staff (role 1) from this station
        const employeeCheck = await executeQuery(
          `SELECT role, fs_id FROM employee_profile WHERE id = ?`,
          [employee_id]
        );

        if (!employeeCheck || employeeCheck.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Employee not found' },
            { status: 404 }
          );
        }

        const empRole = parseInt(employeeCheck[0].role) || 0;
        const empFsId = employeeCheck[0].fs_id || '';

        if (empRole !== 1) {
          return NextResponse.json(
            { success: false, error: 'You can only mark attendance for staff members.' },
            { status: 403 }
          );
        }

        // Check if employee belongs to this station
        const empStationIds = empFsId.toString().split(',').map(id => id.trim());
        if (!empStationIds.includes(station_id.toString())) {
          return NextResponse.json(
            { success: false, error: 'Employee does not belong to this station.' },
            { status: 403 }
          );
        }
      } else {
        // Team Leader and Accountant: verify employee belongs to this station
        const employeeCheck = await executeQuery(
          `SELECT fs_id FROM employee_profile WHERE id = ?`,
          [employee_id]
        );

        if (!employeeCheck || employeeCheck.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Employee not found' },
            { status: 404 }
          );
        }

        const empFsId = employeeCheck[0].fs_id || '';
        const empStationIds = empFsId.toString().split(',').map(id => id.trim());
        if (!empStationIds.includes(station_id.toString())) {
          return NextResponse.json(
            { success: false, error: 'Employee does not belong to this station.' },
            { status: 403 }
          );
        }
      }
    }

    // Check if attendance already exists
    const existing = await executeQuery(
      `SELECT id FROM attendance 
       WHERE employee_id = ? AND station_id = ? AND attendance_date = ?`,
      [employee_id, station_id, attendance_date]
    );

    // Get employee and station names for audit log
    const employeeInfo = await executeQuery(
      `SELECT name, emp_code FROM employee_profile WHERE id = ?`,
      [employee_id]
    );
    const stationInfo = await executeQuery(
      `SELECT station_name FROM filling_stations WHERE id = ?`,
      [station_id]
    );
    const employeeName = employeeInfo.length > 0 ? employeeInfo[0].name : `Employee ID: ${employee_id}`;
    const stationName = stationInfo.length > 0 ? stationInfo[0].station_name : `Station ID: ${station_id}`;

    // Get current user name for audit log
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.userId || currentUser?.id || currentUserId;
      const empResult = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [userId]
      );
      if (empResult.length > 0 && empResult[0].name) {
        userName = empResult[0].name;
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    if (existing && existing.length > 0) {
      // Get old attendance data
      const oldAttendance = await executeQuery(
        `SELECT * FROM attendance WHERE id = ?`,
        [existing[0].id]
      );

      // Update existing record
      const updateQuery = `
        UPDATE attendance 
        SET check_in_time = ?, 
            check_out_time = ?, 
            status = ?, 
            remarks = ?,
            marked_by = ?,
            updated_at = NOW()
        WHERE id = ?
      `;
      
      await executeQuery(updateQuery, [
        check_in_time || null,
        check_out_time || null,
        status || 'Present',
        remarks || null,
        currentUserId,
        existing[0].id
      ]);

      // Get updated attendance data
      const newAttendance = await executeQuery(
        `SELECT * FROM attendance WHERE id = ?`,
        [existing[0].id]
      );

      // Create audit log
      try {
        await createAuditLog({
          page: 'Attendance',
          uniqueCode: `ATTENDANCE-${existing[0].id}`,
          section: 'Edit Attendance',
          userId: currentUserId,
          userName: userName || (currentUserId ? `Employee ID: ${currentUserId}` : null),
          action: 'edit',
          remarks: `Attendance updated for ${employeeName} at ${stationName} on ${attendance_date}. Status: ${status || 'Present'}`,
          oldValue: oldAttendance.length > 0 ? oldAttendance[0] : null,
          newValue: newAttendance.length > 0 ? newAttendance[0] : null,
          recordType: 'attendance',
          recordId: existing[0].id
        });
      } catch (auditError) {
        console.error('❌ Audit log creation failed (non-critical):', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Attendance updated successfully',
        id: existing[0].id
      });
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO attendance 
        (employee_id, station_id, attendance_date, check_in_time, check_out_time, status, remarks, marked_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(insertQuery, [
        employee_id,
        station_id,
        attendance_date,
        check_in_time || null,
        check_out_time || null,
        status || 'Present',
        remarks || null,
        currentUserId
      ]);

      // Get new attendance data
      const newAttendance = await executeQuery(
        `SELECT * FROM attendance WHERE id = ?`,
        [result.insertId]
      );

      // Create audit log
      try {
        await createAuditLog({
          page: 'Attendance',
          uniqueCode: `ATTENDANCE-${result.insertId}`,
          section: 'Create Attendance',
          userId: currentUserId,
          userName: userName || (currentUserId ? `Employee ID: ${currentUserId}` : null),
          action: 'add',
          remarks: `Attendance marked for ${employeeName} at ${stationName} on ${attendance_date}. Status: ${status || 'Present'}`,
          oldValue: null,
          newValue: newAttendance.length > 0 ? newAttendance[0] : null,
          recordType: 'attendance',
          recordId: result.insertId
        });
      } catch (auditError) {
        console.error('❌ Audit log creation failed (non-critical):', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Attendance marked successfully',
        id: result.insertId
      });
    }

  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

