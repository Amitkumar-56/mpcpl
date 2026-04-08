// src/app/api/voucher-activity-pdf/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('=== Voucher Activity PDF API Called ===');

    // Get all voucher data for PDF generation
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
    `;

    console.log('Executing voucher query for PDF...');
    const vouchers = await executeQuery(voucherQuery);
    console.log(`Found ${vouchers.length} vouchers for PDF`);

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

    const statsResult = await executeQuery(statsQuery);
    const stats = statsResult[0] || {
      total_vouchers: 0,
      active_vouchers: 0,
      total_activities: 0
    };

    // Generate HTML for PDF
    const htmlContent = generateHTML(vouchers, stats);

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'attachment; filename="voucher-activity-report.html"'
      }
    });

  } catch (error) {
    console.error('Error in voucher activity PDF API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate PDF data',
        details: error.message
      },
      { status: 500 }
    );
  }
}

function generateHTML(vouchers, stats) {
  const currentDate = new Date().toLocaleDateString('en-IN');

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Voucher Activity Report</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #2563eb;
                margin: 0;
                font-size: 24px;
            }
            .header p {
                margin: 5px 0;
                color: #666;
            }
            .stats {
                display: flex;
                justify-content: space-around;
                margin-bottom: 30px;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            .stat-item {
                text-align: center;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
            }
            .stat-label {
                color: #666;
                font-size: 14px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px 12px;
                text-align: left;
            }
            th {
                background-color: #f8f9fa;
                font-weight: bold;
                color: #333;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>VOUCHER ACTIVITY REPORT</h1>
            <p>Generated on: ${currentDate}</p>
        </div>

        <div class="stats">
            <div class="stat-item">
                <div class="stat-value">${stats.total_vouchers || 0}</div>
                <div class="stat-label">Total Vouchers</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.active_vouchers || 0}</div>
                <div class="stat-label">Active Vouchers</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.total_activities || 0}</div>
                <div class="stat-label">Total Activities</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Voucher ID</th>
                    <th>Voucher No</th>
                    <th>Vehicle No</th>
                    <th>Prepared By</th>
                    <th>Approved By</th>
                    <th>Created Date</th>
                    <th>Activities</th>
                </tr>
            </thead>
            <tbody>
                ${vouchers.map(voucher => `
                    <tr>
                        <td>${voucher.voucher_id}</td>
                        <td>${voucher.voucher_no || 'N/A'}</td>
                        <td>${voucher.vehicle_no || 'N/A'}</td>
                        <td>${voucher.prepared_by_name || 'N/A'}</td>
                        <td>${voucher.approved_by_name || 'N/A'}</td>
                        <td>${voucher.created_at ? new Date(voucher.created_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                        <td>${voucher.activity_count || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>This report contains ${vouchers.length} voucher records.</p>
            <p>Report generated by MPCPL Management System</p>
        </div>
    </body>
    </html>
  `;
}