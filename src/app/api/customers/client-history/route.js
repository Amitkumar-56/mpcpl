// app/api/customers/client-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = parseInt(searchParams.get('id'));
    const pname = searchParams.get('pname') || '';

    if (!cid) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Fetch distinct products
    const products = await executeQuery('SELECT DISTINCT pname FROM products');
    
    // Build main query
    let sql = `
      SELECT 
        fh.*,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number, 
        ep.name AS updated_by_name
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE fh.cl_id = ?
    `;
    
    const params = [cid];
    
    if (pname) {
      sql += ' AND p.pname = ?';
      params.push(pname);
    }
    
    sql += ' ORDER BY fh.id DESC';
    
    const transactions = await executeQuery(sql, params);
    
    // Calculate balance
    const balanceResult = await executeQuery(
      'SELECT balance FROM customer_balances WHERE com_id = ?',
      [cid]
    );
    
    const balance = balanceResult.length > 0 ? Math.round(balanceResult[0].balance) : 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        products: products.map(p => p.pname),
        balance,
        filter: pname
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const cid = parseInt(formData.get('id'));
    const pname = formData.get('pname') || '';

    if (!cid) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Build export query
    let sql = `
      SELECT 
        fh.*,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number, 
        ep.name AS updated_by_name
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE fh.cl_id = ?
    `;
    
    const params = [cid];
    
    if (pname) {
      sql += ' AND p.pname = ?';
      params.push(pname);
    }
    
    sql += ' ORDER BY fh.id DESC';
    
    const rows = await executeQuery(sql, params);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No records found' }, { status: 404 });
    }

    // Prepare CSV data manually
    const csvHeaders = [
      'Station',
      'Completed Date',
      'Product',
      'Vehicle #',
      'Trans Type',
      'Loading Qty',
      'Amount',
      'Credit',
      'Credit Date',
      'Balance',
      'Remaining Limit',
      'Limit',
      'In Amount',
      'Dec Amount',
      'Updated By'
    ];

    // Convert data to CSV format manually
    const csvRows = rows.map(row => [
      row.station_name || '',
      row.filling_date || '',
      row.pname || '',
      row.vehicle_number || '',
      row.trans_type || '',
      row.filling_qty || '',
      row.amount || '',
      row.credit || '',
      row.credit_date || '',
      row.new_amount || '',
      row.remaining_limit || '',
      row.limit_type || '',
      row.in_amount || '',
      row.d_amount || '',
      row.updated_by_name || ''
    ]);

    // Create CSV content manually
    let csvContent = csvHeaders.join(',') + '\n';
    
    csvRows.forEach(row => {
      // Escape fields that might contain commas or quotes
      const escapedRow = row.map(field => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      });
      csvContent += escapedRow.join(',') + '\n';
    });

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transaction_history_${cid}.csv"`
      }
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}