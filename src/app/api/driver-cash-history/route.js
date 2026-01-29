import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const dateFrom = (searchParams.get('dateFrom') || '').trim();
    const dateTo = (searchParams.get('dateTo') || '').trim();
    const limitParam = searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam && !isNaN(limitParam) ? limitParam : '200'), 500);

    const where = [];
    const params = [];

    if (search) {
      where.push('(driver_name LIKE ? OR customer_name LIKE ? OR vehicle_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (dateFrom) {
      where.push('DATE(collected_date) >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      where.push('DATE(collected_date) <= ?');
      params.push(dateTo);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Create table if not exists (using query instead of execute for DDL to be safe)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS driver_cash_collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_name VARCHAR(255) NOT NULL,
        driver_phone VARCHAR(20),
        vehicle_number VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        collected_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        created_by INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_name (customer_name),
        INDEX idx_vehicle_number (vehicle_number),
        INDEX idx_collected_date (collected_date)
      )
    `);

    // Ensure all params are defined
    const safeParams = [...params, Number(limit)];
    
    const rows = await executeQuery(
      `
        SELECT 
          id,
          driver_name,
          driver_phone,
          vehicle_number,
          customer_name,
          amount,
          collected_date,
          remarks,
          created_by,
          created_at
        FROM driver_cash_collections
        ${whereClause}
        ORDER BY collected_date DESC, id DESC
        LIMIT ?
      `,
      safeParams
    );

    return NextResponse.json({ success: true, rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
