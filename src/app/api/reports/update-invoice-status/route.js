// src/app/api/reports/update-invoice-status/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request) {
  try {
    const { record_id, is_invoiced, invoiced_by } = await request.json();

    console.log('📝 Update invoice status:', { record_id, is_invoiced, invoiced_by });

    if (!record_id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Check if record is already invoiced - prevent uninvoicing
    const existingRecord = await executeQuery(
      'SELECT is_invoiced FROM filling_requests WHERE id = ?',
      [record_id]
    );

    if (existingRecord.length > 0 && existingRecord[0].is_invoiced && !is_invoiced) {
      return NextResponse.json(
        { success: false, error: 'Cannot uninvoice. Once invoiced, it cannot be uninvoiced.' },
        { status: 400 }
      );
    }

    // Update the invoice status in the database
    const query = `
      UPDATE filling_requests 
      SET is_invoiced = ?, invoiced_by = ?, invoiced_at = ?
      WHERE id = ?
    `;
    
    const params = [
      is_invoiced ? 1 : 0,
      invoiced_by || null,
      is_invoiced ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
      record_id
    ];

    await executeQuery(query, params);

    // Get the employee name from employee_profile if invoiced_by is provided
    let invoicedByName = null;
    if (invoiced_by) {
      const employeeResult = await executeQuery(
        'SELECT name FROM employee_profile WHERE id = ?',
        [invoiced_by]
      );
      if (employeeResult.length > 0) {
        invoicedByName = employeeResult[0].name;
      }
    }

    // Get current user for audit log
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || invoiced_by || null;
    const userName = currentUser?.userName || invoicedByName || 'System';

    // Create audit log
    await createAuditLog({
      page: 'Reports',
      uniqueCode: record_id.toString(),
      section: 'Filling Requests',
      userId: userId,
      userName: userName,
      action: is_invoiced ? 'invoice' : 'uninvoice',
      remarks: `Record ${is_invoiced ? 'invoiced' : 'uninvoiced'}`,
      oldValue: { is_invoiced: existingRecord[0]?.is_invoiced },
      newValue: { is_invoiced: is_invoiced ? 1 : 0 },
      recordType: 'filling_request',
      recordId: record_id
    });

    return NextResponse.json({
      success: true,
      message: `Record ${is_invoiced ? 'invoiced' : 'uninvoiced'} successfully`,
      invoiced_by_name: invoicedByName
    });

  } catch (error) {
    console.error('❌ Update invoice status error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}