import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tankerId = searchParams.get('id');

    if (!tankerId) {
      return NextResponse.json(
        { success: false, message: 'Tanker ID is required' },
        { status: 400 }
      );
    }

    // Fetch tanker data
    const tankerQuery = "SELECT * FROM tanker_history WHERE id = ?";
    const tankerResult = await executeQuery(tankerQuery, [parseInt(tankerId)]);

    if (tankerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tanker record not found' },
        { status: 404 }
      );
    }

    const tankerData = tankerResult[0];

    // Fetch tanker items using licence_plate = vehicle_no
    let items = [];
    if (tankerData.licence_plate) {
      const itemsQuery = "SELECT * FROM tanker_items WHERE TRIM(vehicle_no) = ?";
      items = await executeQuery(itemsQuery, [tankerData.licence_plate.trim()]);
    }

    // Decode pdf_path JSON to array
    let pdfImages = [];
    if (tankerData.pdf_path) {
      try {
        pdfImages = JSON.parse(tankerData.pdf_path) || [];
      } catch (error) {
        console.error('Error parsing PDF path:', error);
        pdfImages = [];
      }
    }

    // Fetch audit logs for this tanker
    let auditLogs = [];
    try {
      const auditLogsQuery = `
        SELECT 
          al.id,
          al.user_id,
          al.user_name,
          al.action,
          al.remarks,
          al.old_value,
          al.new_value,
          al.created_at,
          ep.name as employee_name,
          ep.employee_code
        FROM audit_log al
        LEFT JOIN employee_profile ep ON al.user_id = ep.id
        WHERE (al.record_type = 'tanker' AND al.record_id = ?)
           OR (al.unique_code LIKE ?)
        ORDER BY al.created_at DESC
      `;
      auditLogs = await executeQuery(auditLogsQuery, [
        parseInt(tankerId),
        `%TANKER-${tankerId}%`
      ]);
      
      // Format audit logs
      auditLogs = (auditLogs || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        user_name: log.employee_name || log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'System'),
        employee_code: log.employee_code,
        action: log.action,
        remarks: log.remarks,
        old_value: log.old_value,
        new_value: log.new_value,
        created_at: log.created_at
      }));
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      auditLogs = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        tanker: tankerData,
        items,
        pdfImages,
        audit_logs: auditLogs
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching tanker data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}