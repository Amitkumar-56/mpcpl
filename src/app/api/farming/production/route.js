// src/app/api/farming/production/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET production records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const product_name = searchParams.get('product_name');

    let query = `
      SELECT p.*, 
        a.tag_id as animal_tag, a.name as animal_name,
        b.batch_code, b.batch_name
      FROM farming_production p
      LEFT JOIN farming_animals a ON p.animal_id = a.id
      LEFT JOIN farming_batches b ON p.batch_id = b.id
      WHERE 1=1
    `;
    let params = [];

    if (type) { query += ` AND p.type = ?`; params.push(type); }
    if (product_name) { query += ` AND p.product_name = ?`; params.push(product_name); }
    if (from_date) { query += ` AND p.production_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND p.production_date <= ?`; params.push(to_date); }

    query += ` ORDER BY p.production_date DESC, p.created_at DESC`;
    const records = await executeQuery(query, params);

    // Get summary
    const summary = await executeQuery(`
      SELECT product_name, unit, SUM(quantity) as total_qty, COUNT(*) as entries
      FROM farming_production
      WHERE 1=1
      ${type ? 'AND type = ?' : ''}
      ${from_date ? 'AND production_date >= ?' : ''}
      ${to_date ? 'AND production_date <= ?' : ''}
      GROUP BY product_name, unit
    `, [...(type ? [type] : []), ...(from_date ? [from_date] : []), ...(to_date ? [to_date] : [])]);

    return NextResponse.json({ success: true, data: records, summary });
  } catch (error) {
    console.error("Production GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create production entry
export async function POST(request) {
  try {
    const {
      type, animal_id, batch_id, product_name, quantity, unit,
      quality_grade, production_date, shift, notes
    } = await request.json();

    if (!type || !product_name) {
      return NextResponse.json({ success: false, error: 'Type and Product Name required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO farming_production 
        (type, animal_id, batch_id, product_name, quantity, unit, quality_grade, production_date, shift, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type, animal_id || null, batch_id || null, product_name,
      quantity || 0, unit || 'kg', quality_grade || '',
      production_date || new Date().toISOString().split('T')[0],
      shift || 'full_day', notes || ''
    ]);

    return NextResponse.json({
      success: true,
      message: 'Production entry recorded',
      id: result.insertId
    });
  } catch (error) {
    console.error("Production POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
