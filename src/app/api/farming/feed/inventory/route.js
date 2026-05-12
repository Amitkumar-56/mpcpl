import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET - List all inventory items
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag_id = searchParams.get('tag_id');
    const status = searchParams.get('status') || 'active';

    if (tag_id) {
      const item = await executeQuery(
        `SELECT * FROM farming_feed_inventory WHERE tag_id = ?`, [tag_id]
      );
      if (item.length === 0) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: item[0] });
    }

    const items = await executeQuery(
      `SELECT * FROM farming_feed_inventory WHERE status = ? ORDER BY arrival_date DESC`, [status]
    );
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Add new stock
export async function POST(request) {
  try {
    const body = await request.json();
    const { feed_name, feed_type, total_quantity, unit, unit_price, supplier, arrival_date, expiry_date, notes } = body;

    if (!feed_name || !total_quantity) {
      return NextResponse.json({ success: false, error: 'Feed Name and Quantity are required' }, { status: 400 });
    }

    // Auto-generate Tag ID for the batch
    const prefix = feed_name.slice(0, 3).toUpperCase();
    const countResult = await executeQuery(`SELECT COUNT(*) as cnt FROM farming_feed_inventory`);
    const nextNum = (countResult[0]?.cnt || 0) + 1;
    const tag_id = `FEED-${prefix}-${String(nextNum).padStart(4, '0')}`;
    const barcode = `BAR-${tag_id}-${Date.now().toString().slice(-4)}`;

    const total_cost = Number(total_quantity) * Number(unit_price || 0);

    const result = await executeQuery(`
      INSERT INTO farming_feed_inventory 
        (tag_id, barcode, feed_name, feed_type, total_quantity, remaining_quantity, unit, unit_price, total_cost, supplier, arrival_date, expiry_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tag_id, barcode, feed_name, feed_type || 'other', total_quantity, total_quantity, 
      unit || 'kg', unit_price || 0, total_cost, supplier || '', 
      arrival_date || new Date().toISOString().split('T')[0], 
      expiry_date || null, notes || ''
    ]);

    return NextResponse.json({ 
      success: true, 
      id: result.insertId, 
      tag_id, 
      message: 'Stock added successfully' 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
