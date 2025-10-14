// app/api/customers/client-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const customerId = searchParams.get('customer_id');
    const productFilter = searchParams.get('product');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    if (!customerId) {
      return NextResponse.json({ success: false, message: 'Customer ID is required' }, { status: 400 });
    }

    // Get customer details including credit limit and grace period
    const customerSql = `SELECT credit_limit, grace_period, account_status FROM customers WHERE id = ?`;
    const customerResult = await executeQuery({ query: customerSql, values: [customerId] });
    const customer = customerResult[0];

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    // Enhanced SQL with outstanding amount calculation
    let sql = `
      SELECT 
        ch.*,
        p.name AS product_name,
        s.station_name,
        fr.vehicle_number,
        e.name AS employee_name,
        -- Calculate outstanding amount
        (ch.amount - COALESCE(ch.credit, 0)) AS outstanding_amount,
        -- Calculate pending days
        CASE 
          WHEN (ch.amount - COALESCE(ch.credit, 0)) > 0 THEN 
            DATEDIFF(CURDATE(), ch.created_at)
          ELSE 0 
        END AS pending_days,
        -- Check if transaction is pending
        CASE 
          WHEN (ch.amount - COALESCE(ch.credit, 0)) > 0 THEN 1 
          ELSE 0 
        END AS is_pending,
        -- Calculate remaining limit considering outstanding
        (?.credit_limit - (SELECT COALESCE(SUM(amount - COALESCE(credit, 0)), 0) 
          FROM client_history ch2 
          WHERE ch2.cl_id = ch.cl_id AND ch2.id <= ch.id)
        ) AS remaining_limit
      FROM client_history AS ch
      LEFT JOIN products AS p ON ch.product_id = p.id
      LEFT JOIN filling_stations AS s ON ch.fs_id = s.id
      LEFT JOIN filling_requests AS fr ON ch.rid = fr.rid
      LEFT JOIN employee_profile AS e ON ch.created_by = e.id
      WHERE ch.cl_id = ?
    `;

    const values = [customer, customerId];

    // Apply product filter if provided
    if (productFilter) {
      sql += ' AND p.name = ?';
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
      LEFT JOIN products AS p ON ch.product_id = p.id
      WHERE ch.cl_id = ?
      ${productFilter ? 'AND p.name = ?' : ''}
    `;
    const countValues = productFilter ? [customerId, productFilter] : [customerId];
    const countResult = await executeQuery({ query: countSql, values: countValues });
    const totalCount = countResult[0]?.total || 0;

    // Calculate total outstanding
    const outstandingSql = `
      SELECT COALESCE(SUM(amount - COALESCE(credit, 0)), 0) AS total_outstanding
      FROM client_history 
      WHERE cl_id = ?
    `;
    const outstandingResult = await executeQuery({ query: outstandingSql, values: [customerId] });
    const totalOutstanding = outstandingResult[0]?.total_outstanding || 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions: rows,
        customer: {
          ...customer,
          total_outstanding: totalOutstanding,
          available_limit: customer.credit_limit - totalOutstanding
        },
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