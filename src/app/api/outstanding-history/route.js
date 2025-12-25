import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
  try {
    // Get all stock entries with supplier, product, station, and transporter info
    const query = `
      SELECT 
        s.id,
        s.supplier_id,
        s.product_id,
        s.fs_id,
        s.invoice_date,
        s.invoice_number,
        s.v_invoice_value,
        s.dncn,
        s.payable,
        s.payment,
        s.status,
        s.transporter_id,
        sup.name AS supplier_name,
        p.pname AS product_name,
        fs.station_name,
        t.name AS transporter_name
      FROM stock s
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      LEFT JOIN transporters t ON s.transporter_id = t.id
      WHERE s.payable > 0
      ORDER BY s.invoice_date DESC, s.id DESC
    `;

    const rows = await executeQuery(query);

    return NextResponse.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error fetching outstanding history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

