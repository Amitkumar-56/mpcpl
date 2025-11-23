// src/app/api/reports/filling-report/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { 
      product = '', 
      loading_station = '', 
      customer = '', 
      from_date = '', 
      to_date = '',
      export: exportData = false,
      page = 1,
      limit = 100
    } = await request.json();

    console.log('🔍 Filters:', { product, loading_station, customer, from_date, to_date });

    const offset = (page - 1) * limit;

    // UPDATED QUERY WITH CHECK STATUS AND EMPLOYEE PROFILE
    let queryStr = `
      SELECT 
        fr.id,
        fr.rid,
        fr.vehicle_number,
        fr.driver_number,
        fr.aqty,
        fr.completed_date,
        fr.created,
        fr.status,
        fr.doc1,
        fr.doc2,
        fr.doc3,
        fr.is_checked,
        fr.checked_by,
        fr.checked_at,
        COALESCE(fr.totalamt, 0) as amount,
        p.pname AS product_name, 
        fs.station_name, 
        c.name AS client_name,
        ep.name as checked_by_name
      FROM filling_requests fr
      LEFT JOIN products p ON fr.product = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN employee_profile ep ON fr.checked_by = ep.id
      WHERE fr.status = 'Completed'
    `;

    const params = [];
    
    // Simple filter logic
    if (product) {
      queryStr += " AND fr.product = ?";
      params.push(product);
    }
    if (loading_station) {
      queryStr += " AND fr.fs_id = ?";
      params.push(loading_station);
    }
    if (customer) {
      queryStr += " AND fr.cid = ?";
      params.push(customer);
    }
    if (from_date && to_date) {
      queryStr += " AND DATE(fr.completed_date) BETWEEN ? AND ?";
      params.push(from_date, to_date);
    }

    queryStr += " ORDER BY fr.created DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    console.log('📝 Query:', queryStr);
    console.log('🔢 Params:', params);

    // Execute query
    const records = await executeQuery(queryStr, params);
    console.log('✅ Records found:', records.length);

    // Calculate totals
    let totalQty = 0;
    let totalAmount = 0;
    records.forEach(row => {
      totalQty += parseFloat(row.aqty || 0);
      totalAmount += parseFloat(row.amount || 0);
    });

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM filling_requests fr 
      WHERE fr.status = 'Completed'
    `;
    const countParams = [];
    
    if (product) {
      countQuery += " AND fr.product = ?";
      countParams.push(product);
    }
    if (loading_station) {
      countQuery += " AND fr.fs_id = ?";
      countParams.push(loading_station);
    }
    if (customer) {
      countQuery += " AND fr.cid = ?";
      countParams.push(customer);
    }
    if (from_date && to_date) {
      countQuery += " AND DATE(fr.completed_date) BETWEEN ? AND ?";
      countParams.push(from_date, to_date);
    }

    const countResult = await executeQuery(countQuery, countParams);
    const totalRecords = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      data: {
        records,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          limit: parseInt(limit)
        },
        totals: {
          pageQty: totalQty,
          pageAmount: totalAmount,
          pageRecords: records.length,
          grandTotalQty: totalQty,
          grandTotalAmount: totalAmount,
          grandTotalRecords: totalRecords
        }
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET for dropdowns
export async function GET() {
  try {
    const [products, stations, customers] = await Promise.all([
      executeQuery("SELECT id, pname FROM products"),
      executeQuery("SELECT id, station_name FROM filling_stations"),
      executeQuery("SELECT id, name FROM customers")
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products: products || [],
        stations: stations || [], 
        customers: customers || []
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}