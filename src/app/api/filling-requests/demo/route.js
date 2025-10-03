import { NextResponse } from 'next/server';
// import { executeQuery } from '../../../lib/db';
import db from '../../../lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const recordsPerPage = parseInt(searchParams.get('records_per_page')) || 10;
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * recordsPerPage;

    let query = `
      SELECT fr.*, 
        c.name as customer_name, 
        fs.station_name, 
        p.pcode as product_name,
        ep.name as updated_by_name
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN product_code p ON p.id = fr.product
      LEFT JOIN employee_profile ep ON ep.id = fr.status_updated_by
      WHERE fr.cid;
    `;

    const params = [];
    const countParams = [];

    if (status) {
      query += ' AND fr.status = ?';
      countQuery += ' AND fr.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      const searchParam = `%${search}%`;
      query += ' AND (fr.rid LIKE ? OR fr.vehicle_number LIKE ? OR c.name LIKE ? OR fs.station_name LIKE ?)';
      countQuery += ' AND (fr.rid LIKE ? OR fr.vehicle_number LIKE ? OR c.name LIKE ? OR fs.station_name LIKE ?)';
      params.push(searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY fr.id DESC LIMIT ?, ?';
    params.push(offset, recordsPerPage);

    // 🔹 Total records
    const countRows = await db(countQuery, countParams);
    const totalRecords = countRows[0]?.total || 0;

    // 🔹 Get requests
    const requests = await db(query, params);

    // 🔹 Process each request
    for (let req of requests) {
      // Auto-cancel pending >72 hrs
      if (req.status === 'Pending') {
        const createdTime = new Date(req.created);
        const currentTime = new Date();
        const hoursPassed = (currentTime - createdTime) / (1000 * 60 * 60);

        if (hoursPassed >= 72) {
          await db(
            'UPDATE filling_requests SET status = "Cancelled" WHERE id = ?',
            [req.id]
          );
          req.status = 'Cancelled';
        }
      }

      // Fix completed date
      if (req.status === 'Completed' &&
        (!req.completed_date || req.completed_date === '0000-00-00 00:00:00')) {
        await db(
          'UPDATE filling_requests SET completed_date = NOW() WHERE id = ?',
          [req.id]
        );
        req.completed_date = new Date().toISOString();
      }

      // Eligibility check
      if (req.status === 'Pending') {
        const priceRows = await db(
          'SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND com_id = ?',
          [req.fs_id, req.product, req.cid]
        );

        const price = priceRows.length > 0 ? priceRows[0].price : 0;

        const balanceRows = await db(
          'SELECT amtlimit FROM customer_balances WHERE com_id = ?',
          [req.cid]
        );

        const amtlimit = balanceRows.length > 0 ? balanceRows[0].amtlimit : 0;
        const totalprice = req.qty * price;

        if (amtlimit === 0 || amtlimit < totalprice) {
          req.eligibility = 'No';
          req.eligibility_reason = 'Insufficient balance';
        } else if (price === 0) {
          req.eligibility = 'No';
          req.eligibility_reason = 'Deal price not set';
        } else {
          req.eligibility = 'Yes';
          req.eligibility_reason = '';
        }
      }
    }

    return NextResponse.json({
      requests,
      currentPage: page,
      recordsPerPage,
      totalRecords,
      totalPages: Math.ceil(totalRecords / recordsPerPage)
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
