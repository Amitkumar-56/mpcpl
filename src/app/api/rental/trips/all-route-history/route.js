import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;

    const history = await executeQuery(`
      SELECT 
        h.*, 
        t.vehicle_no, 
        t.driver_name,
        c.name as customer_name,
        c.company_name as customer_company
      FROM rental_trip_route_history h
      JOIN rental_trips t ON h.trip_id = t.id
      JOIN rental_customers c ON t.rental_customer_id = c.id
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalCount = await executeQuery(`
      SELECT COUNT(*) as count FROM rental_trip_route_history
    `);

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / limit),
        currentPage: page
      }
    });
  } catch (error) {
    console.error("All Route History API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
