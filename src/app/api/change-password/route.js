import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
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
    const users = await executeQuery(
      `SELECT id, role FROM employee_profile WHERE id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }

    const currentUser = users[0];
    
    // Only admin (role 5) can change password
    if (currentUser.role !== 5) {
      return NextResponse.json({ 
        success: false,
        error: 'Only admin can change password' 
      }, { status: 403 });
    }

    const { employeeId, newPassword } = await request.json();

    if (!employeeId || !newPassword) {
      return NextResponse.json({ 
        success: false,
        error: 'Employee ID and new password are required' 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        success: false,
        error: 'Password must be at least 6 characters' 
      }, { status: 400 });
    }

    // Check if employee exists
    const employee = await executeQuery(
      `SELECT id FROM employee_profile WHERE id = ?`,
      [employeeId]
    );

    if (employee.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Employee not found' 
      }, { status: 404 });
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Update password in employee_profile
    await executeQuery(
      `UPDATE employee_profile SET password = ? WHERE id = ?`,
      [hashedPassword, employeeId]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully' 
    });

  } catch (error) {
    console.error('Change password API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

