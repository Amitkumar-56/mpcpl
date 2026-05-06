import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { tank_id, type, kg_qty, litre_qty, remarks } = body;

    if (!tank_id || !type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get current stock
    const currentStockQuery = `SELECT kg_stock, litre_stock FROM manufacturing_tank_stocks WHERE tank_id = ?`;
    const currentStock = await executeQuery(currentStockQuery, [tank_id]);

    const kg_before = currentStock.length > 0 ? parseFloat(currentStock[0].kg_stock) : 0;
    const litre_before = currentStock.length > 0 ? parseFloat(currentStock[0].litre_stock) : 0;

    const kg_change = parseFloat(kg_qty) || 0;
    const litre_change = parseFloat(litre_qty) || 0;

    let kg_after = kg_before;
    let litre_after = litre_before;

    if (type === 'Addition') {
      kg_after += kg_change;
      litre_after += litre_change;
    } else if (type === 'Deduction') {
      kg_after -= kg_change;
      litre_after -= litre_change;
    }

    // 2. Update stock
    const updateQuery = `
      INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE kg_stock = ?, litre_stock = ?
    `;
    await executeQuery(updateQuery, [tank_id, kg_after, litre_after, kg_after, litre_after]);

    // 3. Log history
    const historyQuery = `
      INSERT INTO manufacturing_tank_stock_history 
      (tank_id, type, kg_qty, litre_qty, kg_before, litre_before, kg_after, litre_after, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executeQuery(historyQuery, [
      tank_id, type, kg_change, litre_change,
      kg_before, litre_before, kg_after, litre_after,
      remarks || `Manual ${type}`
    ]);

    return NextResponse.json({
      success: true,
      message: `Stock ${type} successful`,
      data: { kg_after, litre_after }
    });

  } catch (error) {
    console.error("Adjustment error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tank_id = searchParams.get('tank_id');

    let query = `
      SELECT h.*, t.name as tank_name 
      FROM manufacturing_tank_stock_history h
      JOIN manufacturing_tanks t ON h.tank_id = t.id
    `;
    let params = [];

    if (tank_id) {
      query += ` WHERE h.tank_id = ?`;
      params.push(tank_id);
    }

    query += ` ORDER BY h.created_at DESC LIMIT 50`;

    const results = await executeQuery(query, params);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
