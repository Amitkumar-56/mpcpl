// src/app/api/attendance/edit/route.js
// PATCH - Update attendance record
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, check_in_time, check_out_time, status, remarks } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Attendance ID is required' },
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

    // Get current user's role
    const userInfo = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;

    // Staff (role 1) cannot edit attendance
    if (userRole === 1) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Staff cannot edit attendance.' },
        { status: 403 }
      );
    }

    // Get existing attendance record
    const existing = await executeQuery(
      `SELECT * FROM attendance WHERE id = ?`,
      [id]
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Get employee and station names for audit log
    const employeeInfo = await executeQuery(
      `SELECT name, emp_code FROM employee_profile WHERE id = ?`,
      [existing[0].employee_id]
    );
    const stationInfo = await executeQuery(
      `SELECT station_name FROM filling_stations WHERE id = ?`,
      [existing[0].station_id]
    );
    const employeeName = employeeInfo.length > 0 ? employeeInfo[0].name : `Employee ID: ${existing[0].employee_id}`;
    const stationName = stationInfo.length > 0 ? stationInfo[0].station_name : `Station ID: ${existing[0].station_id}`;

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

    // Update attendance record
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
      status || existing[0].status,
      remarks || null,
      currentUserId,
      id
    ]);

    // Get updated attendance data
    const newAttendance = await executeQuery(
      `SELECT * FROM attendance WHERE id = ?`,
      [id]
    );

    // Create audit log
    try {
      await createAuditLog({
        page: 'Attendance',
        uniqueCode: `ATTENDANCE-${id}`,
        section: 'Edit Attendance',
        userId: currentUserId,
        userName: userName || (currentUserId ? `Employee ID: ${currentUserId}` : null),
        action: 'edit',
        remarks: `Attendance updated for ${employeeName} at ${stationName} on ${existing[0].attendance_date}. Status: ${status || existing[0].status}`,
        oldValue: existing[0],
        newValue: newAttendance.length > 0 ? newAttendance[0] : null,
        recordType: 'attendance',
        recordId: parseInt(id)
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully'
    });

  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}



