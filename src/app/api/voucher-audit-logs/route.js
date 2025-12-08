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

    const logs = await executeQuery(
      `SELECT * FROM voucher_audit_log WHERE voucher_id = ? ORDER BY created_at DESC`,
      [voucherId]
    );

    return NextResponse.json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

