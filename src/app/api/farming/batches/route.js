// src/app/api/farming/batches/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET batches
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status') || 'active';

    let query = `SELECT b.*, 
      (SELECT COUNT(*) FROM farming_animals a WHERE a.batch_id = b.id AND a.status = 'active') as current_count
      FROM farming_batches b WHERE 1=1`;
    let params = [];

    if (type) {
      query += ` AND b.type = ?`;
      params.push(type);
    }
    if (status !== 'all') {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY b.created_at DESC`;
    const batches = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: batches });
  } catch (error) {
    console.error("Batches GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create batch
export async function POST(request) {
  try {
    const { type, batch_name, total_count, start_date, notes } = await request.json();

    if (!type || !batch_name) {
      return NextResponse.json({ success: false, error: 'Type and Batch Name required' }, { status: 400 });
    }

    const batch_code = `B-${type.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-8)}`;

    const result = await executeQuery(`
      INSERT INTO farming_batches (batch_code, type, batch_name, total_count, start_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [batch_code, type, batch_name, total_count || 0, start_date || new Date().toISOString().split('T')[0], notes || '']);

    return NextResponse.json({
      success: true,
      message: 'Batch created successfully',
      id: result.insertId,
      batch_code
    });
  } catch (error) {
    console.error("Batches POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update batch
export async function PUT(request) {
  try {
    const { id, batch_name, status, notes, total_count } = await request.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Batch ID required' }, { status: 400 });
    }

    const fields = [];
    const values = [];

    if (batch_name) { fields.push('batch_name = ?'); values.push(batch_name); }
    if (status) { fields.push('status = ?'); values.push(status); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
    if (total_count !== undefined) { fields.push('total_count = ?'); values.push(total_count); }

    values.push(id);
    await executeQuery(`UPDATE farming_batches SET ${fields.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true, message: 'Batch updated' });
  } catch (error) {
    console.error("Batches PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
