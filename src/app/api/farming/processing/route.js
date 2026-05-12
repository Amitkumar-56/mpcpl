import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { ensureFarmingTables } from "@/lib/farming_init";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const source = searchParams.get('source');

    let query = `SELECT * FROM farming_processing WHERE 1=1`;
    let params = [];

    if (type) { query += ` AND type = ?`; params.push(type); }
    if (source) { query += ` AND source_product = ?`; params.push(source); }

    query += ` ORDER BY processing_date DESC, created_at DESC`;
    const records = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const {
      type, source_product, source_quantity, source_unit,
      derivative_product, derivative_quantity, derivative_unit,
      processing_date, notes
    } = await request.json();

    if (!type || !source_product || !derivative_product) {
      return NextResponse.json({ success: false, error: 'Source and Derivative products required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO farming_processing 
        (type, source_product, source_quantity, source_unit, 
         derivative_product, derivative_quantity, derivative_unit, 
         processing_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type, source_product, source_quantity || 0, source_unit || 'litre',
      derivative_product, derivative_quantity || 0, derivative_unit || 'kg',
      processing_date || new Date().toISOString().split('T')[0],
      notes || ''
    ]);

    return NextResponse.json({ success: true, message: 'Processing record created', id: result.insertId });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
