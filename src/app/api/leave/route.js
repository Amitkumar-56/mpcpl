// src/app/api/leave/route.js
import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET - Fetch leave requests with role-based filtering
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employee_id = searchParams.get('employee_id');
    const year = searchParams.get('year') || new Date().getFullYear();

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

    let query = `
      SELECT 
        lr.*,
        ep.name as employee_name,
        ep.emp_code,
        approved_user.name as approved_by_name
      FROM leave_requests lr
      INNER JOIN employee_profile ep ON lr.employee_id = ep.id
      LEFT JOIN employee_profile approved_user ON lr.approved_by = approved_user.id
      WHERE 1=1
    `;

    const params = [];

    // Staff can only see their own leave requests
    if (userRole === 1) {
      query += ' AND lr.employee_id = ?';
      params.push(currentUserId);
    }

    if (employee_id) {
      query += ' AND lr.employee_id = ?';
      params.push(employee_id);
    }

    if (status) {
      query += ' AND lr.status = ?';
      params.push(status);
    }

    if (year) {
      query += ' AND YEAR(lr.from_date) = ?';
      params.push(year);
    }

    query += ' ORDER BY lr.created_at DESC';

    const leaveRequests = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      data: leaveRequests,
      count: leaveRequests.length
    });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new leave request
export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      leave_type, 
      from_date, 
      to_date, 
      reason
    } = body;

    // Validation
    if (!leave_type || !from_date || !to_date || !reason) {
      return NextResponse.json(
        { success: false, error: 'Leave type, from date, to date, and reason are required' },
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

    // Calculate total days
    const fromDate = new Date(from_date);
    const toDate = new Date(to_date);
    const timeDiff = toDate - fromDate;
    const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    if (totalDays <= 0) {
      return NextResponse.json(
        { success: false, error: 'To date must be after from date' },
        { status: 400 }
      );
    }

    // Check for overlapping leave requests
    const overlapping = await executeQuery(
      `SELECT id FROM leave_requests 
       WHERE employee_id = ? 
       AND status IN ('Pending', 'Approved')
       AND ((from_date <= ? AND to_date >= ?) OR (from_date <= ? AND to_date >= ?))`,
      [currentUserId, from_date, from_date, to_date, to_date]
    );

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have a leave request for this period' },
        { status: 400 }
      );
    }

    // Get employee info for audit log
    const employeeInfo = await executeQuery(
      `SELECT name, emp_code FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    const employeeName = employeeInfo.length > 0 ? employeeInfo[0].name : `Employee ID: ${currentUserId}`;

    // Insert leave request (without attachment_url)
    const insertQuery = `
      INSERT INTO leave_requests 
      (employee_id, leave_type, from_date, to_date, total_days, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertQuery, [
      currentUserId,
      leave_type,
      from_date,
      to_date,
      totalDays,
      reason
    ]);

    // Get new leave request data
    const newLeaveRequest = await executeQuery(
      `SELECT * FROM leave_requests WHERE id = ?`,
      [result.insertId]
    );

    // Create audit log
    try {
      await createAuditLog({
        page: 'Leave Management',
        uniqueCode: `LEAVE-${result.insertId}`,
        section: 'Apply Leave',
        userId: currentUserId,
        userName: employeeName,
        action: 'add',
        remarks: `Leave request submitted for ${totalDays} days from ${from_date} to ${to_date}`,
        oldValue: null,
        newValue: newLeaveRequest[0],
        recordType: 'leave',
        recordId: result.insertId
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Leave request submitted successfully',
      data: newLeaveRequest[0]
    });

  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update leave request (approve/reject)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      id, 
      status, 
      rejection_reason 
    } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Leave request ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['Approved', 'Rejected', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get current user and verify permissions
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
      `SELECT role, name FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;
    const userName = userInfo[0].name;

    // Only Admin, Accountant, and Team Leader can approve/reject leaves
    if (userRole < 3 && status !== 'Cancelled') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only Admin, Accountant, and Team Leader can approve/reject leaves.' },
        { status: 403 }
      );
    }

    // Get current leave request
    const currentLeave = await executeQuery(
      `SELECT * FROM leave_requests WHERE id = ?`,
      [id]
    );

    if (!currentLeave || currentLeave.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      );
    }

    const leaveData = currentLeave[0];

    // Staff can only cancel their own pending requests
    if (userRole === 1 && status === 'Cancelled') {
      if (leaveData.employee_id !== currentUserId) {
        return NextResponse.json(
          { success: false, error: 'You can only cancel your own leave requests' },
          { status: 403 }
        );
      }
      if (leaveData.status !== 'Pending') {
        return NextResponse.json(
          { success: false, error: 'You can only cancel pending leave requests' },
          { status: 400 }
        );
      }
    }

    // Update leave request
    const updateQuery = `
      UPDATE leave_requests SET
        status = ?,
        approved_by = ?,
        rejection_reason = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      status,
      status === 'Cancelled' ? null : currentUserId,
      status === 'Rejected' ? rejection_reason : null,
      id
    ]);

    // Get updated record
    const updatedRecord = await executeQuery(
      `SELECT * FROM leave_requests WHERE id = ?`,
      [id]
    );

    // Create audit log
    try {
      await createAuditLog({
        page: 'Leave Management',
        uniqueCode: `LEAVE-${id}`,
        section: 'Update Leave Status',
        userId: currentUserId,
        userName: userName,
        action: 'edit',
        remarks: `Leave request ${status.toLowerCase()}${status === 'Rejected' && rejection_reason ? ` - Reason: ${rejection_reason}` : ''}`,
        oldValue: leaveData,
        newValue: updatedRecord[0],
        recordType: 'leave',
        recordId: id
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`,
      data: updatedRecord[0]
    });

  } catch (error) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}