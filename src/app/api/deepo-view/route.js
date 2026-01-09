import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Deepo ID is required' },
        { status: 400 }
      );
    }

    // Fetch deepo data
    const deepoData = await executeQuery(
      'SELECT * FROM deepo_history WHERE id = ?',
      [id]
    );

    if (deepoData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deepo record not found' },
        { status: 404 }
      );
    }

    const deepo = deepoData[0];

    // Fetch deepo items
    let items = [];
    if (deepo.licence_plate) {
      items = await executeQuery(
        'SELECT * FROM deepo_items WHERE vehicle_no = ?',
        [deepo.licence_plate]
      );
    }

    // Decode pdf_path JSON
    let pdfFiles = [];
    if (deepo.pdf_path) {
      try {
        pdfFiles = JSON.parse(deepo.pdf_path);
        if (!Array.isArray(pdfFiles)) {
          pdfFiles = [];
        }
      } catch (error) {
        console.error('Error parsing PDF paths:', error);
        pdfFiles = [];
      }
    }

    // Fetch audit logs for this deepo
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
        WHERE (al.record_type = 'deepo' AND al.record_id = ?)
           OR (al.unique_code LIKE ?)
        ORDER BY al.created_at DESC
      `;
      auditLogs = await executeQuery(auditLogsQuery, [
        parseInt(id),
        `%DEPOO-${id}%`
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
        deepo,
        items,
        pdfFiles,
        audit_logs: auditLogs
      }
    });

  } catch (error) {
    console.error('Error fetching deepo data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}