// src/app/api/reports/update-invoice-status/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

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