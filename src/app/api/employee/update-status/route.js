import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    console.log('🔐 Update status API called, token exists:', !!token);
    
    if (!token) {
      console.log('❌ No token found in cookies');
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Token verification failed');
      return NextResponse.json({ 
        success: false,
        error: 'Invalid token' 
      }, { status: 401 });
    }

    console.log('✅ Token verified, user ID:', decoded.userId);

    // Check if user is admin (role 5)
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      console.log('❌ No userId found in token');
      return NextResponse.json({ 
        success: false,
        error: 'Invalid token: missing user ID' 
      }, { status: 401 });
    }

    const adminCheck = await executeQuery(
      `SELECT role, name FROM employee_profile WHERE id = ?`,
      [userId]
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 5) {
      return NextResponse.json({ 
        success: false,
        error: 'Only admin can update employee status' 
      }, { status: 403 });
    }

    const currentAdminName = adminCheck[0].name || 'Admin';
    
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
    if (parseInt(employeeId) === userId && status === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'You cannot deactivate your own account' 
      }, { status: 400 });
    }

    const oldStatus = employee[0].status;
    const newStatus = status ? 1 : 0;
    const employeeName = employee[0].name;

    // Update status
    await executeQuery(
      `UPDATE employee_profile SET status = ? WHERE id = ?`,
      [newStatus, employeeId]
    );

    console.log(`✅ Employee ${employeeId} status updated from ${oldStatus} to ${newStatus} by user ${userId}`);

    // Create audit log
    await createAuditLog({
      page: 'Employee Management',
      uniqueCode: `EMPLOYEE-${employeeId}`,
      section: 'Update Status',
      userId: userId,
      userName: currentAdminName,
      action: newStatus === 1 ? 'activate' : 'deactivate',
      remarks: `Employee ${employeeName} ${newStatus === 1 ? 'activated' : 'deactivated'} by ${currentAdminName}`,
      oldValue: { status: oldStatus, name: employeeName },
      newValue: { status: newStatus, name: employeeName },
      fieldName: 'status',
      recordType: 'employee',
      recordId: parseInt(employeeId)
    });

    return NextResponse.json({ 
      success: true,
      message: `Employee ${status ? 'activated' : 'deactivated'} successfully`,
      adminName: currentAdminName
    });

  } catch (error) {
    console.error('Update employee status error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}