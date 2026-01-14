// src/app/api/entity-logs/route.js - Fetch entity-specific logs
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type'); // customer, employee, station, product, voucher
    const entityId = searchParams.get('entity_id');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    // Map entity types to log table names
    const logTableMap = {
      'customer': 'customer_logs',
      'employee': 'employee_logs',
      'station': 'station_logs',
      'product': 'product_logs',
      'voucher': 'voucher_logs',
      'supplier': 'supplier_logs',
      'transporter': 'transporter_logs',
      'stock_transfer': 'stock_transfer_logs'
    };

    const tableName = logTableMap[entityType];
    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity_type' },
        { status: 400 }
      );
    }

    let logsQuery = '';
    let logs = [];

    // Special handling for stock_transfer logs
    if (entityType === 'stock_transfer') {
      logsQuery = `
        SELECT 
          stl.*,
          COALESCE(ep.name, stl.performed_by_name) as user_name,
          ep.name as employee_name,
          fs_from.station_name as station_from_name,
          fs_to.station_name as station_to_name,
          p.pname as product_name
        FROM stock_transfer_logs stl
        LEFT JOIN employee_profile ep ON stl.performed_by = ep.id
        LEFT JOIN filling_stations fs_from ON stl.station_from = fs_from.id
        LEFT JOIN filling_stations fs_to ON stl.station_to = fs_to.id
        LEFT JOIN products p ON stl.product_id = p.id
        WHERE stl.transfer_id = ?
        ORDER BY stl.performed_at DESC, stl.id DESC
        LIMIT 50
      `;
      
      logs = await executeQuery(logsQuery, [String(entityId)]);
    } else {
      // Original query for other entity types
      logsQuery = `
        SELECT 
          cl.*,
          COALESCE(
            ep.name,
            c.name,
            cl.created_by
          ) as created_by_name,
          COALESCE(
            ep_updated.name,
            ep_updated.id
          ) as updated_by_name,
          COALESCE(
            ep_processed.name,
            ep_processed.id
          ) as processed_by_name,
          COALESCE(
            ep_completed.name,
            ep_completed.id
          ) as completed_by_name
        FROM ${tableName} cl
        LEFT JOIN employee_profile ep ON cl.created_by = ep.id
        LEFT JOIN customers c ON cl.created_by = c.id AND '${entityType}' = 'customer'
        LEFT JOIN employee_profile ep_updated ON cl.updated_by = ep_updated.id
        LEFT JOIN employee_profile ep_processed ON cl.processed_by = ep_processed.id
        LEFT JOIN employee_profile ep_completed ON cl.completed_by = ep_completed.id
        WHERE cl.${entityType}_id = ?
        ORDER BY COALESCE(cl.created_date, cl.updated_date, cl.processed_date, cl.completed_date) DESC, cl.id DESC
        LIMIT 50
      `;

      logs = await executeQuery(logsQuery, [String(entityId)]);
    }

    // Format dates
    const formattedLogs = logs.map(log => {
      const formattedLog = { ...log };
      
      // Handle stock_transfer logs with performed_at field
      if (entityType === 'stock_transfer') {
        formattedLog.performed_at_formatted = log.performed_at 
          ? new Date(log.performed_at).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : null;
      } else {
        // Original date formatting for other entity types
        formattedLog.created_date_formatted = log.created_date 
          ? new Date(log.created_date).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : null;
        formattedLog.updated_date_formatted = log.updated_date 
          ? new Date(log.updated_date).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : null;
        formattedLog.processed_date_formatted = log.processed_date 
          ? new Date(log.processed_date).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : null;
        formattedLog.completed_date_formatted = log.completed_date 
          ? new Date(log.completed_date).toLocaleString('en-IN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : null;
      }
      
      return formattedLog;
    });

    // Also fetch audit logs for more details
    const auditLogsQuery = `
      SELECT 
        id,
        action,
        user_name,
        remarks,
        old_value,
        new_value,
        action_date,
        action_time,
        created_at
      FROM audit_log
      WHERE record_type = ? AND record_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const auditLogs = await executeQuery(auditLogsQuery, [entityType, parseInt(entityId)]);

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      audit_logs: auditLogs || []
    });

  } catch (error) {
    console.error('Error fetching entity logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

