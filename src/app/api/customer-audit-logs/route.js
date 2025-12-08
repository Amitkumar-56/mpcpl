import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS customer_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        user_id INT,
        user_name VARCHAR(255),
        remarks TEXT,
        amount DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_id (customer_id),
        INDEX idx_created_at (created_at)
      )
    `);

    const logs = await executeQuery(
      `SELECT 
        cal.*,
        COALESCE(ep.name, cal.user_name, 'System') AS employee_name
      FROM customer_audit_log cal
      LEFT JOIN employee_profile ep ON cal.user_id = ep.id
      WHERE cal.customer_id = ? 
      ORDER BY cal.created_at DESC`,
      [customerId]
    );

    // Map the results to use employee_name
    const logsWithNames = logs.map(log => ({
      ...log,
      user_name: log.employee_name || log.user_name || 'System'
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

