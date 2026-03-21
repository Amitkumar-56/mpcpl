// src/app/api/old-filling-requests/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('=== Old Filling Requests API Called ===');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');
    const loadingStation = searchParams.get('loading_station');
    const exportMode = searchParams.get('export') === 'true';
    
    // For export, use higher limit
    const actualLimit = exportMode ? 10000 : limit;
    const offset = (page - 1) * actualLimit;

    // Build base query with conditions
    let whereConditions = [];
    let queryParams = [];
    
    if (fromDate) {
      whereConditions.push('DATE(ofr.completed_date) >= ?');
      queryParams.push(fromDate);
    }
    
    if (toDate) {
      whereConditions.push('DATE(ofr.completed_date) <= ?');
      queryParams.push(toDate);
    }
    
    if (loadingStation) {
      whereConditions.push('ofr.fs_id = ?');
      queryParams.push(loadingStation);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query with customer and station name joins
    const sql = `
      SELECT 
        ofr.id,
        ofr.rid as request_id,
        ofr.product,
        ofr.vehicle_number as vehicle_no,
        ofr.cid as customer_id,
        c.name as client_name,
        ofr.aqty,
        ofr.fs_id,
        fs.station_name as station_name,
        ofr.driver_number,
        ofr.completed_date,
        ofr.status,
        ofr.remark
      FROM old_filling_requests ofr
      LEFT JOIN customers c ON ofr.cid = c.id
      LEFT JOIN filling_stations fs ON ofr.fs_id = fs.id
      ${whereClause}
      ORDER BY ofr.id DESC
      ${exportMode ? '' : `LIMIT ? OFFSET ?`}
    `;

    console.log('Fetching records with filters:', { fromDate, toDate, page, limit, exportMode });
    
    const queryParamsWithLimit = exportMode ? queryParams : [...queryParams, actualLimit, offset];
    const results = await executeQuery(sql, queryParamsWithLimit);
    console.log(`Found ${results.length} records`);

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM old_filling_requests ofr
      LEFT JOIN customers c ON ofr.cid = c.id
      LEFT JOIN filling_stations fs ON ofr.fs_id = fs.id
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countSql, queryParams);
    const total = countResult[0].total;

    // Format the data for frontend
    const formattedRequests = results.map(row => {
      return {
        request_id: row.request_id || row.id,
        product: row.product || 'N/A',
        loading_station: row.station_name || 'N/A',
        vehicle_no: row.vehicle_no || 'N/A',
        client_name: row.client_name || 'N/A',
        filling_qty: row.aqty || 'N/A',
        completed_date: row.completed_date ? new Date(row.completed_date).toLocaleString('en-IN') : '',
        status: row.status || 0,
        remark: row.remark || ''
      };
    });

    return NextResponse.json({
      success: true,
      requests: formattedRequests,
      pagination: {
        page: page,
        limit: actualLimit,
        total: total,
        totalPages: Math.ceil(total / actualLimit),
        hasNext: page * actualLimit < total,
        hasPrev: page > 1
      },
      exportMode: exportMode
    });

  } catch (error) {
    console.error('Error in old-filling-requests API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch old filling requests',
      requests: []
    }, { status: 500 });
  }
}