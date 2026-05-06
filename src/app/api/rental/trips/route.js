import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Ensure voucher_no column exists
    try {
      // Check if column exists first
      const columnCheck = await executeQuery(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'rental_trips' 
        AND COLUMN_NAME = 'voucher_no'
      `);
      
      if (columnCheck.length === 0) {
        await executeQuery("ALTER TABLE rental_trips ADD COLUMN voucher_no VARCHAR(100) AFTER state");
      }
    } catch (e) {
      console.log('Column check or add failed:', e.message);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customer_id');
    const search = searchParams.get('search') || "";
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;
    
    let whereClauses = [];
    let params = [];

    if (status) {
      whereClauses.push('t.status = ?');
      params.push(status);
    }

    if (customerId) {
      whereClauses.push('t.rental_customer_id = ?');
      params.push(customerId);
    }

    if (search) {
      whereClauses.push(`(
        t.vehicle_no LIKE ? OR 
        v.licence_plate LIKE ? OR
        t.driver_name LIKE ? OR 
        rc.name LIKE ? OR 
        rc.company_name LIKE ? OR 
        t.source LIKE ? OR 
        t.destination LIKE ? OR
        t.id LIKE ?
      )`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereString = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';
    
    // Get total counts and aggregate metrics for the filtered result (not just the page)
    const statsQuery = `
      SELECT 
        COUNT(*) as totalCount,
        SUM(COALESCE(t.received_amount, 0)) as totalRevenue,
        SUM(COALESCE(t.total_expense, 0)) as totalExpense,
        SUM(COALESCE(t.profit_loss, 0)) as totalProfit
      FROM rental_trips t
      JOIN rental_customers rc ON t.rental_customer_id = rc.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      ${whereString}
    `;
    const stats = await executeQuery(statsQuery, params);
    const { totalCount, totalRevenue, totalExpense, totalProfit } = stats[0];

    // Get paginated results
    const query = `
      SELECT t.*, rc.name as rental_customer_name, rc.company_name as rc_company_name, v.licence_plate as current_vehicle_no
      FROM rental_trips t
      JOIN rental_customers rc ON t.rental_customer_id = rc.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      ${whereString}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    // Create a copy of params for the main query to avoid modifying the original
    const queryWithPagination = query.replace('LIMIT ? OFFSET ?', `LIMIT ${limit} OFFSET ${offset}`);
    const trips = await executeQuery(queryWithPagination, params);
    
    return NextResponse.json({
      success: true,
      data: trips,
      totals: {
        count: totalCount || 0,
        revenue: totalRevenue || 0,
        expense: totalExpense || 0,
        profit: totalProfit || 0
      },
      pagination: {
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit),
        currentPage: page,
        limit: limit
      }
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      rental_customer_id, 
      vehicle_id, 
      vehicle_no, 
      driver_name, 
      driver_number, 
      company_name, 
      source, 
      destination, 
      state,
      remarks 
    } = body;

    if (!rental_customer_id || !vehicle_no) {
      return NextResponse.json({ error: 'Customer and Vehicle Number are required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO rental_trips (
        rental_customer_id, vehicle_id, vehicle_no, driver_name, driver_number, 
        company_name, source, destination, state, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      rental_customer_id || null, 
      vehicle_id || null, 
      vehicle_no || null, 
      driver_name || null, 
      driver_number || null, 
      company_name || null, 
      source || null, 
      destination || null, 
      state || null, 
      remarks || null
    ]);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
