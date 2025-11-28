// src/app/api/employee/update-status/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid token' 
      }, { status: 401 });
    }

    // Check if user is admin (role 5)
    const adminCheck = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [decoded.userId]
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 5) {
      return NextResponse.json({ 
        success: false,
        error: 'Only admin can update employee status' 
      }, { status: 403 });
    }

    const { employeeId, status } = await request.json();

    if (!employeeId || status === undefined) {
      return NextResponse.json({ 
        success: false,
        error: 'Employee ID and status are required' 
      }, { status: 400 });
    }

    // Check if employee exists
    const employee = await executeQuery(
      `SELECT id, name, status FROM employee_profile WHERE id = ?`,
      [employeeId]
    );

    if (employee.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Employee not found' 
      }, { status: 404 });
    }

    // Prevent admin from deactivating themselves
    if (parseInt(employeeId) === decoded.userId && status === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'You cannot deactivate your own account' 
      }, { status: 400 });
    }

    // Update status
    await executeQuery(
      `UPDATE employee_profile SET status = ? WHERE id = ?`,
      [status ? 1 : 0, employeeId]
    );

    return NextResponse.json({ 
      success: true,
      message: `Employee ${status ? 'activated' : 'deactivated'} successfully` 
    });

  } catch (error) {
    console.error('Update employee status error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

