// src/app/api/manufacturing/process/route.js
import { executeQuery, executeTransaction } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = `SELECT b.*, 
                 (SELECT COUNT(*) FROM mfg_batch_materials bm WHERE bm.batch_id = b.id) as material_count,
                 (SELECT COUNT(*) FROM mfg_lab_tests lt WHERE lt.batch_id = b.id) as test_count
                 FROM mfg_batches b WHERE 1=1`;
    const params = [];

    if (status) {
      query += " AND b.status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (b.batch_code LIKE ? OR b.product_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY b.created_at DESC";
    const batches = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: batches });
  } catch (error) {
    console.error("Batch fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { product_name, batch_date, target_quantity, unit, notes, materials, created_by } = body;

    if (!product_name) {
      return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
    }

    // Auto-generate batch code: BATCH-YYYYMMDD-XXXX
    const dateStr = (batch_date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    const [lastBatch] = await executeQuery(
      "SELECT batch_code FROM mfg_batches WHERE batch_code LIKE ? ORDER BY id DESC LIMIT 1",
      [`BATCH-${dateStr}-%`]
    ).catch(() => [null]);

    let nextNum = 1;
    if (lastBatch?.batch_code) {
      const match = lastBatch.batch_code.match(/BATCH-\d+-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const batch_code = `BATCH-${dateStr}-${String(nextNum).padStart(4, '0')}`;

    const result = await executeTransaction(async (conn) => {
      // Create batch
      const [batchResult] = await conn.execute(
        `INSERT INTO mfg_batches (batch_code, batch_date, product_name, target_quantity, unit, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [batch_code, batch_date || new Date().toISOString().split('T')[0], product_name, target_quantity || 0, unit || 'kg', notes || null, created_by || null]
      );

      const batchId = batchResult.insertId;

      // Add materials if provided
      if (materials && Array.isArray(materials) && materials.length > 0) {
        for (const mat of materials) {
          await conn.execute(
            `INSERT INTO mfg_batch_materials (batch_id, material_id, material_name, quantity_used, unit) VALUES (?, ?, ?, ?, ?)`,
            [batchId, mat.material_id, mat.material_name || null, mat.quantity_used || 0, mat.unit || 'kg']
          );

          // Deduct from raw material stock
          if (mat.material_id && mat.quantity_used > 0) {
            await conn.execute(
              "UPDATE mfg_raw_materials SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?",
              [mat.quantity_used, mat.material_id]
            );
          }
        }
      }

      return { insertId: batchId };
    });

    return NextResponse.json({ success: true, message: "Batch created", id: result.insertId, batch_code });
  } catch (error) {
    console.error("Batch create error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, status, actual_quantity, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    // Check current status - once completed/rejected, cannot change
    const [current] = await executeQuery("SELECT status FROM mfg_batches WHERE id=?", [id]);
    if (!current) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }
    if (current.status === 'completed' || current.status === 'rejected') {
      return NextResponse.json({ success: false, error: "Completed/Rejected batch cannot be modified" }, { status: 400 });
    }

    // Draft can move to in_process, in_process to testing, testing to completed/rejected
    const validTransitions = {
      'draft': ['in_process'],
      'in_process': ['testing', 'draft'],
      'testing': ['completed', 'rejected', 'in_process'],
    };

    if (status && validTransitions[current.status] && !validTransitions[current.status].includes(status)) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot transition from ${current.status} to ${status}` 
      }, { status: 400 });
    }

    const updates = [];
    const params = [];

    if (status) { 
      updates.push("status=?"); 
      params.push(status);
      if (status === 'completed') {
        updates.push("completed_at=NOW()");
      }
    }
    if (actual_quantity !== undefined) { updates.push("actual_quantity=?"); params.push(actual_quantity); }
    if (notes !== undefined) { updates.push("notes=?"); params.push(notes); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    params.push(id);
    await executeQuery(`UPDATE mfg_batches SET ${updates.join(', ')} WHERE id=?`, params);

    return NextResponse.json({ success: true, message: "Batch updated" });
  } catch (error) {
    console.error("Batch update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
