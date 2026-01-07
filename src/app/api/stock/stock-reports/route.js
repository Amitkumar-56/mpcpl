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
    const fetchStations = searchParams.get('fetch_stations') || '';

    console.log('API Called with params:', { startDate, endDate, exportData, stationFilter, fetchStations });

    // If only stations are requested, return station list
    if (fetchStations === 'true') {
      const stationsQuery = `
        SELECT id, station_name, status 
        FROM filling_stations 
        WHERE status = 1 
        ORDER BY station_name ASC
      `;
      const stations = await executeQuery(stationsQuery);
      
      return NextResponse.json({
        success: true,
        stations: stations || []
      });
    }
    
    // Build base query with employee name for logs - FIXED to show all stations
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
             fh.amount,
             fh.new_amount,
             fh.remaining_limit,
             COALESCE(ep.name, NULL) AS created_by_name,
             fh.created_by,
             fh.filling_date AS transaction_date,
             CASE 
               WHEN fh.trans_type = 'Inward' THEN 'Inward'
               WHEN fh.trans_type = 'Outward' THEN 'Outward'
               ELSE fh.trans_type
             END AS action_type
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

    // Enhance with last edited info from audit_log
    const enhancedResults = [];
    for (const row of results) {
      let editedByName = null;
      let editedAt = null;
      let editedDeltaQty = null;
      let editedDeltaAmount = null;
      try {
        const rid = row?.rid;
        if (rid) {
          const editLogs = await executeQuery(
            `
              SELECT al.*, COALESCE(ep.name, al.user_name) AS edited_by_name
              FROM audit_log al
              LEFT JOIN employee_profile ep ON al.user_id = ep.id
              WHERE (al.unique_code LIKE ? OR al.remarks LIKE ?)
                AND al.action IN ('edit','update')
              ORDER BY al.created_at DESC, al.action_date DESC, al.action_time DESC
              LIMIT 1
            `,
            [`%${rid}%`, `%${rid}%`]
          );
          if (editLogs.length > 0) {
            const log = editLogs[0];
            editedByName = log.edited_by_name || log.user_name || null;
            // Prefer created_at; fallback to action_date + action_time
            if (log.created_at) {
              editedAt = log.created_at;
            } else if (log.action_date && log.action_time) {
              editedAt = `${log.action_date} ${log.action_time}`;
            }
            try {
              const oldVal = log.old_value ? JSON.parse(log.old_value) : null;
              const newVal = log.new_value ? JSON.parse(log.new_value) : null;
              const oldQty = oldVal ? (parseFloat(oldVal.aqty ?? oldVal.qty ?? 0) || 0) : null;
              const newQty = newVal ? (parseFloat(newVal.aqty ?? newVal.qty ?? 0) || 0) : null;
              const oldAmt = oldVal ? (parseFloat(oldVal.totalamt ?? oldVal.amount ?? 0) || 0) : null;
              const newAmt = newVal ? (parseFloat(newVal.totalamt ?? newVal.amount ?? 0) || 0) : null;
              if (oldQty !== null && newQty !== null) {
                editedDeltaQty = parseFloat((newQty - oldQty).toFixed(2));
              }
              if (oldAmt !== null && newAmt !== null) {
                editedDeltaAmount = parseFloat((newAmt - oldAmt).toFixed(2));
              }
            } catch (parseErr) {
              // ignore parse errors
            }
          }
        }
      } catch (e) {
        console.log('Edited info fetch failed for row:', row?.rid, e?.message);
      }
      enhancedResults.push({ 
        ...row, 
        edited_by_name: editedByName, 
        edited_at: editedAt,
        edited_delta_qty: editedDeltaQty,
        edited_delta_amount: editedDeltaAmount
      });
    }

    // Handle export request
    if (exportData === 'true') {
      return generateCSV(enhancedResults);
    }

    return NextResponse.json({
      success: true,
      data: enhancedResults || [],
      total: enhancedResults ? enhancedResults.length : 0
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
