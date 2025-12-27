import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stock_id');
    const stationId = searchParams.get('station_id');
    const productId = searchParams.get('product_id');

    if (!stockId && !stationId) {
      return NextResponse.json(
        { success: false, error: 'Stock ID or Station ID is required' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS stock_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stock_id INT,
        station_id INT,
        product_id INT,
        action_type VARCHAR(50) NOT NULL,
        user_id INT,
        user_name VARCHAR(255),
        remarks TEXT,
        quantity DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_stock_id (stock_id),
        INDEX idx_station_id (station_id),
        INDEX idx_created_at (created_at)
      )
    `);

    let query = '';
    let params = [];

    if (stockId) {
      query = `SELECT 
        sal.*,
        COALESCE(ep.name, sal.user_name) AS employee_name
      FROM stock_audit_log sal
      LEFT JOIN employee_profile ep ON sal.user_id = ep.id
      WHERE sal.stock_id = ? 
      ORDER BY sal.created_at DESC`;
      params = [stockId];
    } else if (stationId && productId) {
      query = `SELECT 
        sal.*,
        COALESCE(ep.name, sal.user_name) AS employee_name
      FROM stock_audit_log sal
      LEFT JOIN employee_profile ep ON sal.user_id = ep.id
      WHERE sal.station_id = ? AND sal.product_id = ?
      ORDER BY sal.created_at DESC`;
      params = [stationId, productId];
    } else {
      query = `SELECT 
        sal.*,
        COALESCE(ep.name, sal.user_name) AS employee_name
      FROM stock_audit_log sal
      LEFT JOIN employee_profile ep ON sal.user_id = ep.id
      WHERE sal.station_id = ?
      ORDER BY sal.created_at DESC`;
      params = [stationId];
    }

    const logs = await executeQuery(query, params);

    // Map the results to use employee_name
    const logsWithNames = logs.map(log => ({
      ...log,
      user_name: log.employee_name || log.user_name || (log.user_id ? `Employee ID: ${log.user_id}` : null)
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

