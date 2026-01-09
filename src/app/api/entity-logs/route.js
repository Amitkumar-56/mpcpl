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
      'transporter': 'transporter_logs'
    };

    const tableName = logTableMap[entityType];
    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity_type' },
        { status: 400 }
      );
    }

    // Fetch logs with employee/customer names
    const logsQuery = `
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
      LIMIT 1
    `;

    const logs = await executeQuery(logsQuery, [String(entityId)]);

    // Format dates
    const formattedLogs = logs.map(log => ({
      ...log,
      created_date_formatted: log.created_date 
        ? new Date(log.created_date).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : null,
      updated_date_formatted: log.updated_date 
        ? new Date(log.updated_date).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : null,
      processed_date_formatted: log.processed_date 
        ? new Date(log.processed_date).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : null,
      completed_date_formatted: log.completed_date 
        ? new Date(log.completed_date).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : null
    }));

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

