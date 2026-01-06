// src/app/api/attendance/edit/route.js
// PATCH - Update attendance record
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

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


