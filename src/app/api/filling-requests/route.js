import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    console.log('🚀 API CALL STARTED...');

    const { searchParams } = new URL(request.url);
    const safeParseInt = (val, defaultVal) => {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    const page = safeParseInt(searchParams.get('page'), 1);
    const recordsPerPage = Math.min(safeParseInt(searchParams.get('records_per_page'), 10), 100);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const stationId = searchParams.get('station_id') || '';

    console.log('📊 Filters:', { page, recordsPerPage, status, search, startDate, endDate, stationId });

    const offset = (page - 1) * recordsPerPage;

    // Base query
    let query = `
      SELECT 
        fr.*, 
        c.name as customer_name, 
        c.phone as customer_phone,
        fs.station_name as loading_station,
        pc.pcode as product_name,
        ep.name as updated_by_name,
        cb.amtlimit as customer_balance
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN product_codes pc ON pc.id = fr.fl_id
      LEFT JOIN employee_profile ep ON ep.id = fr.status_updated_by
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (status) {
      query += ' AND fr.status = ?';
      countQuery += ' AND fr.status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (stationId) {
      query += ' AND fr.fs_id = ?';
      countQuery += ' AND fr.fs_id = ?';
      params.push(parseInt(stationId));
      countParams.push(parseInt(stationId));
    }

    if (startDate) {
      query += ' AND DATE(fr.created) >= ?';
      countQuery += ' AND DATE(fr.created) >= ?';
      params.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(fr.created) <= ?';
      countQuery += ' AND DATE(fr.created) <= ?';
      params.push(endDate);
      countParams.push(endDate);
    }

    if (search) {
      const searchParam = `%${search}%`;
      query += ' AND (fr.rid LIKE ? OR fr.vehicle_number LIKE ? OR c.name LIKE ? OR fs.station_name LIKE ? OR pc.pcode LIKE ? OR c.phone LIKE ?)';
      countQuery += ' AND (fr.rid LIKE ? OR fr.vehicle_number LIKE ? OR c.name LIKE ? OR fs.station_name LIKE ? OR pc.pcode LIKE ? OR c.phone LIKE ?)';
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    // ✅ FIX: LIMIT cannot use placeholders, inject directly with safety checks
    const safeOffset = Math.max(0, offset);
    const safeRecordsPerPage = Math.min(Math.max(1, recordsPerPage), 100);
    query += ` ORDER BY fr.id DESC LIMIT ${safeOffset}, ${safeRecordsPerPage}`;

    console.log('📋 Executing queries...');

    // Get total records count
    const countResult = await executeQuery(countQuery, countParams);
    const totalRecords = countResult[0]?.total || 0;

    console.log('📈 Total records found:', totalRecords);

    // Get requests data
    const requests = await executeQuery(query, params);

    console.log('✅ Raw requests from database:', requests.length);

    // Process eligibility
    const processedRequests = requests.map((request) => {
      let eligibility = 'N/A';
      let eligibility_reason = '';

      if (request.status === 'Pending') {
        if (request.customer_balance === 0 || request.customer_balance < (request.qty * 100)) {
          eligibility = 'No';
          eligibility_reason = 'Insufficient Balance';
        } else {
          eligibility = 'Yes';
          eligibility_reason = '';
        }
      }

      return {
        ...request,
        eligibility,
        eligibility_reason
      };
    });

    const responseData = {
      requests: processedRequests,
      currentPage: page,
      recordsPerPage: recordsPerPage,
      totalRecords: totalRecords,
      totalPages: Math.ceil(totalRecords / recordsPerPage)
    };

    console.log('🚀 API CALL COMPLETED.', responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
