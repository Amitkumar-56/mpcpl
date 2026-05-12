// src/app/api/farming/feed/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { ensureFarmingTables } from "@/lib/farming_init";

// GET feed records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    let query = `
      SELECT f.*, 
        a.tag_id as animal_tag, a.name as animal_name,
        b.batch_code, b.batch_name
      FROM farming_feed f
      LEFT JOIN farming_animals a ON f.animal_id = a.id
      LEFT JOIN farming_batches b ON f.batch_id = b.id
      WHERE 1=1
    `;
    let params = [];

    if (type) { query += ` AND f.type = ?`; params.push(type); }
    if (from_date) { query += ` AND f.feed_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND f.feed_date <= ?`; params.push(to_date); }

    query += ` ORDER BY f.feed_date DESC, f.created_at DESC`;
    const records = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Feed GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create feed entry
export async function POST(request) {
  try {
    const {
      type, animal_id, batch_id, feed_name, quantity, unit,
      cost_per_unit, total_cost, feed_date, notes
    } = await request.json();

    if (!type || !feed_name) {
      return NextResponse.json({ success: false, error: 'Type and Feed Name required' }, { status: 400 });
    }

    const computedTotal = total_cost || (quantity * cost_per_unit) || 0;

    const result = await executeQuery(`
      INSERT INTO farming_feed 
        (type, animal_id, batch_id, feed_name, quantity, unit, total_cost, feed_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type, animal_id || null, batch_id || null, feed_name,
      quantity || 0, unit || 'kg', computedTotal,
      feed_date || new Date().toISOString().split('T')[0], notes || ''
    ]);

    return NextResponse.json({
      success: true,
      message: 'Feed record saved',
      id: result.insertId
    });
  } catch (error) {
    console.error("Feed POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
