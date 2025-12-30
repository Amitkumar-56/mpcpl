import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucherId = searchParams.get('voucher_id');

    if (!voucherId) {
      return NextResponse.json(
        { success: false, error: 'Voucher ID is required' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS voucher_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        voucher_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        user_id INT,
        user_name VARCHAR(255),
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_voucher_id (voucher_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // ✅ JOIN with employee_profile to get proper employee names
    const logs = await executeQuery(
      `SELECT 
        val.*,
        COALESCE(ep.name, val.user_name) AS employee_name
      FROM voucher_audit_log val
      LEFT JOIN employee_profile ep ON val.user_id = ep.id
      WHERE val.voucher_id = ? 
      ORDER BY val.created_at DESC`,
      [voucherId]
    );

    // Map results to use employee_name (never 'System')
    const logsWithNames = logs.map(log => ({
      ...log,
      user_name: log.employee_name || log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : 'Unknown')
    }));

    return NextResponse.json({
      success: true,
      data: logsWithNames
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

