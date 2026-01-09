// /api/change-password/route.js

import { executeQuery, getConnection } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request) {
  try {
    console.log('🔐 Change password API called');
    
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    console.log('🍪 Token exists:', !!token);
    
    if (!token) {
      console.log('❌ No token found in cookies');
      return NextResponse.json({
        success: false,
        error: 'Not authenticated. Please login again.'
      }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Token verification failed');
      return NextResponse.json({
        success: false,
        error: 'Invalid token. Please login again.'
      }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      console.log('❌ No userId found in token');
      return NextResponse.json({
        success: false,
        error: 'Invalid token: missing user ID'
      }, { status: 401 });
    }

    console.log('✅ Token verified, user ID:', userId);

    // Check if user is admin
    const adminCheck = await executeQuery(
      `SELECT id, name, role FROM employee_profile WHERE id = ?`,
      [userId]
    );

    if (adminCheck.length === 0) {
      console.log('❌ User not found in database');
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const adminUser = adminCheck[0];
    const adminRole = Number(adminUser.role);
    
    console.log('🔍 Admin check:', {
      id: adminUser.id,
      name: adminUser.name,
      role: adminRole,
      isAdmin: adminRole === 5
    });

    if (adminRole !== 5) {
      console.log('❌ Access denied: User is not admin. Role:', adminRole);
      return NextResponse.json({
        success: false,
        error: 'Only admin can change passwords'
      }, { status: 403 });
    }

    console.log('✅ Admin access confirmed');

    // Get request body
    const body = await request.json();
    const { employeeId, newPassword } = body;
    
    console.log('📦 Request data:', {
      employeeId,
      passwordLength: newPassword?.length
    });

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

    // Validate employee ID
    const empId = parseInt(employeeId);
    if (isNaN(empId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid employee ID'
      }, { status: 400 });
    }

    // Check if employee exists
    const employeeCheck = await executeQuery(
      `SELECT id, name, emp_code FROM employee_profile WHERE id = ?`,
      [empId]
    );

    if (employeeCheck.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Employee not found'
      }, { status: 404 });
    }

    console.log('✅ Employee found:', employeeCheck[0]);

    // Hash the password using SHA-256 (same as login)
    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    console.log('🔐 Password hashed:', {
      originalLength: newPassword.length,
      hashedLength: hashedPassword.length,
      hashPreview: hashedPassword.substring(0, 20) + '...'
    });

    // Check current password in DB
    const currentPassword = await executeQuery(
      `SELECT password FROM employee_profile WHERE id = ?`,
      [empId]
    );
    
    console.log('🔍 Current DB password:', currentPassword[0]?.password);

    // Update the password
    console.log('🔄 Updating password in database...');
    console.log('📝 SQL: UPDATE employee_profile SET password = ? WHERE id = ?');
    console.log('📝 Params: [hashedPassword, empId] = [', hashedPassword.substring(0, 20) + '...,', empId, ']');
    
    // Use getConnection to get affectedRows
    const connection = await getConnection();
    try {
      const [updateResult] = await connection.execute(
        `UPDATE employee_profile SET password = ? WHERE id = ?`,
        [hashedPassword, empId]
      );

      console.log('📊 Update result:', {
        affectedRows: updateResult.affectedRows,
        changedRows: updateResult.changedRows,
        warningCount: updateResult.warningCount
      });

      if (updateResult.affectedRows === 0) {
        console.log('❌ No rows affected - employee may not exist or password unchanged');
        return NextResponse.json({
          success: false,
          error: 'Failed to update password. Employee may not exist.'
        }, { status: 500 });
      }

      // Verify update by reading back
      const [verifyResult] = await connection.execute(
        `SELECT password FROM employee_profile WHERE id = ?`,
        [empId]
      );

      const updatedPassword = verifyResult[0]?.password;
      
      if (updatedPassword === hashedPassword) {
        console.log('✅ Password successfully updated and verified!');

        // ✅ Send notification to all admins about password change
        try {
          const io = global._io;
          if (io) {
            // Get admin name who changed the password
            const adminName = adminUser.name || 'Admin';
            
            // Emit notification to all admins (role 5)
            io.to('role_5').emit('password_change_notification', {
              type: 'employee_password_changed',
              employeeId: employeeCheck[0].id,
              employeeName: employeeCheck[0].name,
              employeeCode: employeeCheck[0].emp_code || '',
              changedBy: {
                id: userId,
                name: adminName
              },
              timestamp: Date.now(),
              message: `Employee password changed: ${employeeCheck[0].name} (${employeeCheck[0].emp_code || employeeCheck[0].id}) by ${adminName}`
            });
            console.log('✅ Password change notification sent to admins');
          }
        } catch (notifError) {
          console.error('⚠️ Error sending password change notification:', notifError);
          // Don't fail the request if notification fails
        }

        // ✅ Create audit log for password change
        try {
          const { createAuditLog } = await import('@/lib/auditLog');
          await createAuditLog({
            page: 'Change Password',
            uniqueCode: `PASS-CHANGE-EMP-${employeeCheck[0].id}`,
            section: 'Password Management',
            userId: userId,
            userName: adminUser.name,
            action: 'edit',
            remarks: `Password changed for employee: ${employeeCheck[0].name} (${employeeCheck[0].emp_code || employeeCheck[0].id})`,
            oldValue: { password: '***' },
            newValue: { password: '***' },
            recordType: 'employee',
            recordId: employeeCheck[0].id
          });
        } catch (auditError) {
          console.error('⚠️ Error creating audit log:', auditError);
        }

        return NextResponse.json({
          success: true,
          message: `Password updated successfully for employee ${employeeCheck[0].name}`,
          employee: {
            id: employeeCheck[0].id,
            name: employeeCheck[0].name,
            emp_code: employeeCheck[0].emp_code
          }
        });
      } else {
        console.log('❌ Password verification failed!');
        console.log('Expected hash:', hashedPassword.substring(0, 40) + '...');
        console.log('Got hash:', updatedPassword?.substring(0, 40) + '...');
        
        return NextResponse.json({
          success: false,
          error: 'Password update verification failed. Please try again.'
        }, { status: 500 });
      }
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error: ' + error.message
    }, { status: 500 });
  }
}