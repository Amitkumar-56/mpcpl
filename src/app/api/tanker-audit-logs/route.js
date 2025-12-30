import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tankerId = searchParams.get('tanker_id');

    if (!tankerId) {
      return NextResponse.json(
        { success: false, error: 'Tanker ID is required' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS tanker_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanker_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        user_id INT,
        user_name VARCHAR(255),
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tanker_id (tanker_id),
        INDEX idx_created_at (created_at)
      )
    `);

    const logs = await executeQuery(
      `SELECT 
        tal.*,
        COALESCE(ep.name, tal.user_name) AS employee_name
      FROM tanker_audit_log tal
      LEFT JOIN employee_profile ep ON tal.user_id = ep.id
      WHERE tal.tanker_id = ? 
      ORDER BY tal.created_at DESC`,
      [tankerId]
    );

    // Map the results to use employee_name (never null or 'System')
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

