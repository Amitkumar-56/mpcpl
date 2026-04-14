// src/app/api/manufacturing/tanker-allocation/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const tanker_type = searchParams.get('tanker_type');
    const search = searchParams.get('search');

    let query = `SELECT ta.*, rm.material_name as raw_material_name, b.batch_code 
                 FROM mfg_tanker_allocation ta 
                 LEFT JOIN mfg_raw_materials rm ON ta.material_id = rm.id
                 LEFT JOIN mfg_batches b ON ta.batch_id = b.id
                 WHERE 1=1`;
    const params = [];

    if (status) {
      query += " AND ta.status = ?";
      params.push(status);
    }
    if (tanker_type) {
      query += " AND ta.tanker_type = ?";
      params.push(tanker_type);
    }
    if (search) {
      query += " AND (ta.tanker_code LIKE ? OR ta.vehicle_number LIKE ? OR ta.driver_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY ta.created_at DESC";
    const allocations = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: allocations });
  } catch (error) {
    console.error("Tanker allocation fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { tanker_type, material_id, material_name, batch_id, quantity, unit, driver_name, vehicle_number, allocation_date, notes, created_by } = body;

    if (!tanker_type || !vehicle_number) {
      return NextResponse.json({ success: false, error: "Tanker type and vehicle number are required" }, { status: 400 });
    }

    // Auto-generate tanker code
    const prefix = tanker_type === 'type_a_raw' ? 'TK-A' : 'TK-O';
    const [lastTanker] = await executeQuery(
      "SELECT tanker_code FROM mfg_tanker_allocation ORDER BY id DESC LIMIT 1"
    ).catch(() => [null]);

    let nextNum = 1;
    if (lastTanker?.tanker_code) {
      const match = lastTanker.tanker_code.match(/TK-[AO]-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const tanker_code = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    const result = await executeQuery(
      `INSERT INTO mfg_tanker_allocation (tanker_code, tanker_type, material_id, material_name, batch_id, quantity, unit, driver_name, vehicle_number, allocation_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tanker_code, tanker_type, material_id || null, material_name || null, batch_id || null, quantity || 0, unit || 'kg', driver_name || null, vehicle_number, allocation_date || new Date().toISOString().split('T')[0], notes || null, created_by || null]
    );

    return NextResponse.json({ success: true, message: "Tanker allocated", id: result.insertId, tanker_code });
  } catch (error) {
    console.error("Tanker allocation create error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status, quantity, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Allocation ID is required" }, { status: 400 });
    }

    // Check current status - if completed, cannot change
    const [current] = await executeQuery("SELECT status FROM mfg_tanker_allocation WHERE id=?", [id]);
    if (current?.status === 'completed') {
      return NextResponse.json({ success: false, error: "Completed allocation cannot be modified" }, { status: 400 });
    }

    const updates = [];
    const params = [];

    if (status) { updates.push("status=?"); params.push(status); }
    if (quantity !== undefined) { updates.push("quantity=?"); params.push(quantity); }
    if (notes !== undefined) { updates.push("notes=?"); params.push(notes); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    params.push(id);
    await executeQuery(`UPDATE mfg_tanker_allocation SET ${updates.join(', ')} WHERE id=?`, params);

    return NextResponse.json({ success: true, message: "Tanker allocation updated" });
  } catch (error) {
    console.error("Tanker allocation update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
