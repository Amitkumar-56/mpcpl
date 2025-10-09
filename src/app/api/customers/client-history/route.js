// app/api/customers/client-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const clientId = searchParams.get('cl_id'); // client id
    const productFilter = searchParams.get('product_id'); // optional filter
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    if (!clientId) {
      return NextResponse.json({ success: false, message: 'Client ID is required' }, { status: 400 });
    }

    // Base SQL with joins for related data
    let sql = `
      SELECT 
        ch.*,
        p.name AS product_name,
        s.station_name,
        fr.vehicle_number,
        e.name AS updated_by_name
      FROM client_history AS ch
      LEFT JOIN products AS p ON ch.product_id = p.id
      LEFT JOIN filling_stations AS s ON ch.fs_id = s.id
      LEFT JOIN filling_requests AS fr ON ch.rid = fr.rid
      LEFT JOIN employee_profile AS e ON ch.created_by = e.id
      WHERE ch.cl_id = ?
    `;

    const values = [clientId];

    // Apply product filter if provided
    if (productFilter) {
      sql += ' AND ch.product_id = ?';
      values.push(productFilter);
    }

    // Sorting + Pagination
    sql += ' ORDER BY ch.created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);

    // Execute query
    const rows = await executeQuery({ query: sql, values });

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) AS total
      FROM client_history AS ch
      ${productFilter ? 'WHERE ch.cl_id = ? AND ch.product_id = ?' : 'WHERE ch.cl_id = ?'}
    `;
    const countValues = productFilter ? [clientId, productFilter] : [clientId];
    const countResult = await executeQuery({ query: countSql, values: countValues });
    const totalCount = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching client history:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
