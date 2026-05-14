import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { ensureFarmingTables } from "@/lib/farming_init";

export async function GET(request) {
  try {
    await ensureFarmingTables();
    const { searchParams } = new URL(request.url);
    const worker_name = searchParams.get('worker_name');
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM farming_labor_logs WHERE 1=1`;
    let params = [];

    if (worker_name) {
      query += ` AND worker_name LIKE ?`;
      params.push(`%${worker_name}%`);
    }

    query += ` ORDER BY log_date DESC, created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const records = await executeQuery(query, params);

    const countResult = await executeQuery(`SELECT COUNT(*) as total FROM farming_labor_logs WHERE 1=1 ${worker_name ? 'AND worker_name LIKE ?' : ''}`, worker_name ? [`%${worker_name}%`] : []);
    const total = countResult[0].total;

    return NextResponse.json({
      success: true,
      data: records,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureFarmingTables();
    const body = await request.json();
    const {
      worker_name, food_inward_qty, late_arrival, late_fine,
      outside_food_qty, outside_food_cost, log_date, notes
    } = body;

    if (!worker_name) {
      return NextResponse.json({ success: false, error: 'Worker Name is required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO farming_labor_logs 
        (worker_name, food_inward_qty, late_arrival, late_fine, 
         outside_food_qty, outside_food_cost, log_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      worker_name, food_inward_qty || 0, late_arrival || 'no', late_fine || 0,
      outside_food_qty || 0, outside_food_cost || 0, 
      log_date || new Date().toISOString().split('T')[0],
      notes || ''
    ]);

    return NextResponse.json({ success: true, message: 'Labor log created', id: result.insertId });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
