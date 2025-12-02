// src/app/api/stock/stock-reports/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const exportData = searchParams.get('export') || '';
    const stationFilter = searchParams.get('station') || '';

    console.log('API Called with params:', { startDate, endDate, exportData, stationFilter });
    
    // Build base query with employee name for logs
    let sql = `
      SELECT fh.rid, 
             f.station_name AS fs_name, 
             f.id AS station_id,
             p.pname AS product_name, 
             fh.trans_type, 
             fh.current_stock, 
             fh.filling_qty, 
             fh.available_stock, 
             fh.filling_date,
             ep.name AS created_by_name,
             fh.created_by,
             fh.filling_date AS transaction_date
      FROM filling_history fh
      JOIN filling_stations f ON fh.fs_id = f.id
      JOIN products p ON fh.product_id = p.id
      LEFT JOIN employee_profile ep ON fh.created_by = ep.id
      WHERE 1=1
    `;

    // Add date filters if provided
    const params = [];
    if (startDate) {
      sql += " AND DATE(fh.filling_date) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND DATE(fh.filling_date) <= ?";
      params.push(endDate);
    }
    if (stationFilter) {
      sql += " AND f.station_name LIKE ?";
      params.push(`%${stationFilter}%`);
    }

    sql += " ORDER BY fh.filling_date DESC";

    console.log('Executing SQL:', sql);
    console.log('With parameters:', params);

    // Execute query
    const results = await executeQuery(sql, params);
    
    console.log('Query results:', results);

    // Handle export request
    if (exportData === 'true') {
      return generateCSV(results);
    }

    return NextResponse.json({
      success: true,
      data: results || [],
      total: results ? results.length : 0
    });

  } catch (error) {
    console.error('Error fetching stock reports:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stock reports',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function generateCSV(data) {
  if (!data || data.length === 0) {
    return new NextResponse('No data available', { status: 404 });
  }

  const headers = ['S No', 'FS Name', 'Product Name', 'Transaction Type', 'Current Stock', 'Filling Qty', 'Available Stock', 'Filling Date'];
  
  let csvContent = headers.join(',') + '\n';
  
  data.forEach((row, index) => {
    const rowData = [
      index + 1,
      `"${row.fs_name || ''}"`,
      `"${row.product_name || ''}"`,
      `"${row.trans_type || ''}"`,
      row.current_stock || 0,
      row.filling_qty || 0,
      row.available_stock || 0,
      `"${row.filling_date || ''}"`
    ];
    csvContent += rowData.join(',') + '\n';
  });

  const response = new NextResponse(csvContent);
  response.headers.set('Content-Type', 'text/csv; charset=utf-8');
  response.headers.set('Content-Disposition', `attachment; filename=filling_history_${new Date().toISOString().split('T')[0]}.csv`);
  
  return response;
}