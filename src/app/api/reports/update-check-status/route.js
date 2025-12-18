// app/api/reports/update-check-status/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request) {
  try {
    const { record_id, is_checked, checked_by } = await request.json();

    console.log('📝 Update check status:', { record_id, is_checked, checked_by });

    if (!record_id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Check if record is already checked - prevent unchecking
    const existingRecord = await executeQuery(
      'SELECT is_checked FROM filling_requests WHERE id = ?',
      [record_id]
    );

    if (existingRecord.length > 0 && existingRecord[0].is_checked && !is_checked) {
      return NextResponse.json(
        { success: false, error: 'Cannot uncheck. Once checked, it cannot be unchecked.' },
        { status: 400 }
      );
    }

    // Update the check status in the database
    const query = `
      UPDATE filling_requests 
      SET is_checked = ?, checked_by = ?, checked_at = ?
      WHERE id = ?
    `;
    
    const params = [
      is_checked ? 1 : 0,
      checked_by || null,
      is_checked ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
      record_id
    ];

    await executeQuery(query, params);

    // Get the employee name from employee_profile if checked_by is provided
    let checkedByName = null;
    if (checked_by) {
      const employeeResult = await executeQuery(
        'SELECT name FROM employee_profile WHERE id = ?',
        [checked_by]
      );
      if (employeeResult.length > 0) {
        checkedByName = employeeResult[0].name;
      }
    }

    // Get current user for audit log
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || checked_by || null;
    const userName = currentUser?.userName || checkedByName || 'System';

    // Create audit log
    await createAuditLog({
      page: 'Reports',
      uniqueCode: record_id.toString(),
      section: 'Filling Requests',
      userId: userId,
      userName: userName,
      action: is_checked ? 'approve' : 'reject',
      remarks: `Record ${is_checked ? 'checked' : 'unchecked'}`,
      oldValue: { is_checked: existingRecord[0]?.is_checked },
      newValue: { is_checked: is_checked ? 1 : 0 },
      recordType: 'filling_request',
      recordId: record_id
    });

    return NextResponse.json({
      success: true,
      message: `Record ${is_checked ? 'checked' : 'unchecked'} successfully`,
      checked_by_name: checkedByName
    });

  } catch (error) {
    console.error('❌ Update check status error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}