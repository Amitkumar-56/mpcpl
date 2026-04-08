// src/app/api/voucher-activity-summary/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  let connection = null;
  try {
    console.log('=== Voucher Activity Summary API Called ===');

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Get a single connection for all queries
    connection = await executeQuery('SELECT 1');

    // Get voucher activity summary with employee names
    const voucherQuery = `
      SELECT
        v.voucher_id,
        v.voucher_no,
        v.vehicle_no,
        v.updated_at as created_at,
        v.prepared_by,
        v.approved_by,
        COALESCE(p.name, 'Unknown') as prepared_by_name,
        COALESCE(a.name, 'Unknown') as approved_by_name,
        COALESCE(activity_counts.total_activities, 0) + COALESCE(voucher_log_counts.voucher_log_activities, 0) as activity_count
      FROM vouchers v
      LEFT JOIN employee_profile p ON v.prepared_by = p.id
      LEFT JOIN employee_profile a ON v.approved_by = a.id
      LEFT JOIN (
        SELECT
          record_id,
          COUNT(*) as total_activities
        FROM audit_log
        WHERE record_type = 'voucher'
        GROUP BY record_id
      ) activity_counts ON v.voucher_id = activity_counts.record_id
      LEFT JOIN (
        SELECT
          voucher_id,
          COUNT(*) as voucher_log_activities
        FROM voucher_audit_log
        GROUP BY voucher_id
      ) voucher_log_counts ON v.voucher_id = voucher_log_counts.voucher_id
      ORDER BY v.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    console.log('Executing voucher activity query...');
    const vouchers = await executeQuery(voucherQuery);
    console.log(`Found ${vouchers.length} vouchers`);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vouchers v
      LEFT JOIN employee_profile p ON v.prepared_by = p.id
      LEFT JOIN employee_profile a ON v.approved_by = a.id
    `;
    const countResult = await executeQuery(countQuery);
    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_vouchers,
        COUNT(CASE WHEN v.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_vouchers,
        COALESCE(SUM(activity_counts.total_activities), 0) + COALESCE(SUM(voucher_log_counts.voucher_log_activities), 0) as total_activities
      FROM vouchers v
      LEFT JOIN (
        SELECT
          record_id,
          COUNT(*) as total_activities
        FROM audit_log
        WHERE record_type = 'voucher'
        GROUP BY record_id
      ) activity_counts ON v.voucher_id = activity_counts.record_id
      LEFT JOIN (
        SELECT
          voucher_id,
          COUNT(*) as voucher_log_activities
        FROM voucher_audit_log
        GROUP BY voucher_id
      ) voucher_log_counts ON v.voucher_id = voucher_log_counts.voucher_id
    `;

    console.log('Executing stats query...');
    const statsResult = await executeQuery(statsQuery);
    const stats = statsResult[0] || {
      total_vouchers: 0,
      active_vouchers: 0,
      total_activities: 0
    };

    console.log('Stats:', stats);

    return NextResponse.json({
      success: true,
      vouchers: vouchers,
      stats: {
        totalVouchers: stats.total_vouchers || 0,
        activeVouchers: stats.active_vouchers || 0,
        totalActivities: stats.total_activities || 0
      },
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_records: totalRecords,
        limit: limit,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Error in voucher activity summary API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch voucher activity summary',
        details: error.message
      },
      { status: 500 }
    );
  }
}