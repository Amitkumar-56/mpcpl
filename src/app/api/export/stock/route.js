import { executeQuery } from "@/lib/db";
import ExcelJS from 'exceljs';
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const pname = searchParams.get('pname');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    const cid = id ? parseInt(id) : 0;

    // Build the query with same filters as stock history
    let sql = `
      SELECT 
        fh.*, 
        p.pname, 
        fr.vehicle_number,
        fs.station_name
      FROM filling_history AS fh
      INNER JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      WHERE 1=1
    `;

    let params = [];
    let conditions = [];

    if (cid) {
      conditions.push("fh.fs_id = ?");
      params.push(cid);
    }

    if (pname && pname.trim() !== '') {
      conditions.push("p.pname = ?");
      params.push(pname);
    }

    if (from_date) {
      conditions.push("DATE(fh.filling_date) >= ?");
      params.push(new Date(from_date).toISOString().split('T')[0]);
    }

    if (to_date) {
      conditions.push("DATE(fh.filling_date) <= ?");
      params.push(new Date(to_date).toISOString().split('T')[0]);
    }

    if (conditions.length > 0) {
      sql += " AND " + conditions.join(" AND ");
    }

    sql += " ORDER BY fh.id DESC";

    // Execute the query
    const rows = await executeQuery(sql, params);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Stock History');

    // Add title row
    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value = 'Stock History Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add filter info
    if (from_date || to_date || pname) {
      let filterText = 'Filters: ';
      const filters = [];
      if (from_date) filters.push(`From: ${from_date}`);
      if (to_date) filters.push(`To: ${to_date}`);
      if (pname) filters.push(`Product: ${pname}`);
      filterText += filters.join(', ');

      worksheet.mergeCells('A2:J2');
      worksheet.getCell('A2').value = filterText;
      worksheet.getCell('A2').font = { italic: true };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };
    }

    // Add headers
    const headers = [
      'ID', 
      'Station Name', 
      'Filling Date', 
      'Product Name', 
      'Transaction Type',
      'Vehicle Number',
      'Current Stock',
      'Loading Quantity', 
      'Available Stock',
      'Remarks'
    ];

    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(4);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E5BFF' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Add data rows
    rows.forEach(row => {
      const rowData = [
        row.id,
        row.station_name || 'Unknown Station',
        new Date(row.filling_date).toLocaleDateString('en-US'),
        row.pname,
        row.trans_type,
        row.trans_type?.toLowerCase() === 'outward' ? (row.vehicle_number || 'N/A') : 'N/A',
        row.current_stock,
        row.filling_qty,
        row.available_stock,
        row.remarks || ''
      ];
      worksheet.addRow(rowData);
    });

    // Auto-fit columns
    worksheet.columns = [
      { width: 10 },  // ID
      { width: 20 },  // Station Name
      { width: 15 },  // Filling Date
      { width: 20 },  // Product Name
      { width: 15 },  // Transaction Type
      { width: 15 },  // Vehicle Number
      { width: 15 },  // Current Stock
      { width: 15 },  // Loading Quantity
      { width: 15 },  // Available Stock
      { width: 20 }   // Remarks
    ];

    // Style data rows
    for (let i = 5; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.alignment = { vertical: 'middle' };
      
      // Alternate row colors
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8F9FA' }
        };
      }
    }

    // Set response headers for file download
    const buffer = await workbook.xlsx.writeBuffer();
    
    const filename = `stock-history-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Error generating Excel export:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Excel export',
        message: error.message 
      },
      { status: 500 }
    );
  }
}