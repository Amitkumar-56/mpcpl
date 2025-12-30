import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deepoId = searchParams.get('deepo_id');

    if (!deepoId) {
      return NextResponse.json(
        { success: false, error: 'Deepo ID is required' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS deepo_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        deepo_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        user_id INT,
        user_name VARCHAR(255),
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_deepo_id (deepo_id),
        INDEX idx_created_at (created_at)
      )
    `);

    const logs = await executeQuery(
      `SELECT 
        dal.*,
        COALESCE(ep.name, dal.user_name) AS employee_name
      FROM deepo_audit_log dal
      LEFT JOIN employee_profile ep ON dal.user_id = ep.id
      WHERE dal.deepo_id = ? 
      ORDER BY dal.created_at DESC`,
      [deepoId]
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

