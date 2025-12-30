import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const stationId = searchParams.get('station_id') || '';

    let query = `
      SELECT 
        fr.rid as "Request ID",
        fr.vehicle_number as "Vehicle No",
        fr.driver_number as "Driver Phone",
        c.name as "Client Name",
        fs.station_name as "Loading Station",
        pc.pcode as "Product",
        fr.qty as "Quantity",
        fr.status as "Status",
        CASE WHEN fr.created IS NOT NULL THEN DATE_FORMAT(fr.created, '%d/%m/%Y %h:%i %p') ELSE NULL END as "Created Date",
        CASE WHEN fr.completed_date IS NOT NULL THEN DATE_FORMAT(fr.completed_date, '%d/%m/%Y %h:%i %p') ELSE NULL END as "Completed Date",
        fl_created.created_by_name as "Created By",
        ep_processing.name as "Processed By",
        ep_completed.name as "Completed By"
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN product_codes pc ON pc.id = fr.sub_product_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          COALESCE(
            (SELECT c.name FROM customers c WHERE c.id = fl.created_by LIMIT 1),
            (SELECT ep.name FROM employee_profile ep WHERE ep.id = fl.created_by LIMIT 1),
            NULL
          ) as created_by_name
        FROM filling_logs fl
        WHERE fl.created_by IS NOT NULL
        AND fl.id = (
          SELECT fl2.id 
          FROM filling_logs fl2 
          WHERE fl2.request_id = fl.request_id 
          AND fl2.created_by IS NOT NULL
          ORDER BY fl2.created_date DESC, fl2.id DESC
          LIMIT 1
        )
      ) fl_created ON fr.rid = fl_created.request_id
      LEFT JOIN filling_logs fl_processing ON fr.rid = fl_processing.request_id
      LEFT JOIN employee_profile ep_processing ON fl_processing.processed_by = ep_processing.id
      LEFT JOIN filling_logs fl_completed ON fr.rid = fl_completed.request_id
      LEFT JOIN employee_profile ep_completed ON fl_completed.completed_by = ep_completed.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND fr.status = ?';
      params.push(status);
    }

    if (stationId) {
      query += ' AND fr.fs_id = ?';
      params.push(parseInt(stationId));
    }

    if (startDate) {
      query += ' AND DATE(fr.created) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(fr.created) <= ?';
      params.push(endDate);
    }

    if (search) {
      const searchParam = `%${search}%`;
      query += ' AND (fr.rid LIKE ? OR fr.vehicle_number LIKE ? OR c.name LIKE ? OR fs.station_name LIKE ? OR pc.pcode LIKE ?)';
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    query += ' ORDER BY fr.id DESC';

    const requests = await executeQuery(query, params);

    // Generate CSV
    const headers = [
      'Request ID', 'Vehicle No', 'Driver Phone', 'Client Name', 'Loading Station',
      'Product', 'Quantity', 'Status', 'Created Date', 'Completed Date',
      'Created By', 'Processed By', 'Completed By'
    ];

    let csvContent = headers.join(',') + '\n';

    requests.forEach((row) => {
      const rowData = [
        `"${row['Request ID'] || ''}"`,
        `"${row['Vehicle No'] || ''}"`,
        `"${row['Driver Phone'] || ''}"`,
        `"${row['Client Name'] || ''}"`,
        `"${row['Loading Station'] || ''}"`,
        `"${row['Product'] || ''}"`,
        row['Quantity'] || 0,
        `"${row['Status'] || ''}"`,
        `"${row['Created Date'] || ''}"`,
        `"${row['Completed Date'] || ''}"`,
        `"${row['Created By'] || ''}"`,
        `"${row['Processed By'] || ''}"`,
        `"${row['Completed By'] || ''}"`
      ];
      csvContent += rowData.join(',') + '\n';
    });

    const response = new NextResponse(csvContent);
    response.headers.set('Content-Type', 'text/csv; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename=filling_requests_${new Date().toISOString().split('T')[0]}.csv`);

    return response;

  } catch (error) {
    console.error('❌ Export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: error.message },
      { status: 500 }
    );
  }
}

