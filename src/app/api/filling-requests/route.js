import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    console.log('🚀 API CALL STARTED...');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const recordsPerPage = Math.min(parseInt(searchParams.get('records_per_page')) || 10, 100);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const stationId = searchParams.get('station_id') || '';

    console.log('📊 Filters:', { page, recordsPerPage, status, search, startDate, endDate, stationId });

    const offset = (page - 1) * recordsPerPage;

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

    // query += ' ORDER BY fr.id DESC LIMIT ?, ?';
    // params.push(offset, recordsPerPage);
    query += ` ORDER BY fr.id DESC LIMIT ${offset}, ${recordsPerPage}`;


    console.log('📋 Executing queries...');

    // Get total records count
    const countResult = await executeQuery(countQuery, countParams);
    const totalRecords = countResult[0]?.total || 0;

    console.log('📈 Total records found:', totalRecords);

    // Get requests data
    const requests = await executeQuery(query, params);

    console.log('✅ Raw requests from database:', requests.length);

    if (request.status === 'Pending') {
  const qty = parseFloat(request.qty) || 0;
  const balance = parseFloat(request.customer_balance) || 0;
  if (balance === 0 || balance < qty * 100) {
    eligibility = 'No';
    eligibility_reason = 'Insufficient Balance';
  } else {
    eligibility = 'Yes';
  }
}


    console.log('✅ Processed requests:', processedRequests.length);

    // Return the full response object that frontend expects
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
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customer, products_codes, station_id, vehicle_no, driver_no, request_type, qty, remarks
    } = body;

    // Validate required fields
    if (!customer || !products_codes || !station_id || !vehicle_no || !driver_no || !qty) {
      return NextResponse.json({ 
        error: "All fields are required" 
      }, { status: 400 });
    }

    if (parseFloat(qty) <= 0) {
      return NextResponse.json({ 
        error: "Quantity must be greater than 0" 
      }, { status: 400 });
    }

    // Generate the next RID
    const ridResult = await executeQuery(
      "SELECT rid FROM filling_requests ORDER BY id DESC LIMIT 1"
    );
    
    let nextRID = "MP000001";
    if (ridResult.length > 0) {
      const lastRID = ridResult[0].rid;
      if (lastRID && lastRID.startsWith('MP')) {
        const lastNumber = parseInt(lastRID.substring(2));
        nextRID = `MP${String(lastNumber + 1).padStart(6, '0')}`;
      }
    }

    // Get current timestamp
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Get product name
    const productResult = await executeQuery(
      "SELECT pcode FROM product_codes WHERE id = ?",
      [products_codes]
    );
    const productName = productResult.length > 0 ? productResult[0].pcode : 'Unknown Product';

    // Insert into filling_requests table
    const result = await executeQuery(
      `INSERT INTO filling_requests (
        rid, fl_id, fs_id, vehicle_number, driver_number, rtype, qty, aqty, 
        created, cid, status, remark, product
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextRID, parseInt(products_codes), parseInt(station_id),
        vehicle_no, driver_no, request_type, parseFloat(qty), parseFloat(qty),
        currentDate, parseInt(customer), 'Pending', remarks || '', productName
      ]
    );

    if (result.affectedRows > 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Request created successfully",
        rid: nextRID 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to create request" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ POST API Error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error.message 
    }, { status: 500 });
  }
}