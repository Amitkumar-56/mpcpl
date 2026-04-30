import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { requestId, action } = await request.json(); // action: 'Approved' or 'Rejected'

    if (!requestId || !action) {
      return NextResponse.json({ success: false, error: "Request ID and action are required" }, { status: 400 });
    }

    if (action === 'Approved') {
      // 1. Get request details
      const reqResults = await executeQuery(
        "SELECT * FROM manufacturing_tank_stock_requests WHERE id = ? AND status = 'Pending'",
        [requestId]
      );

      if (reqResults.length === 0) {
        return NextResponse.json({ success: false, error: "Request not found or already processed" }, { status: 404 });
      }

      const req = reqResults[0];
      const kgAdj = req.operation_type === 'minus' ? -req.kg_qty : req.kg_qty;
      const litreAdj = req.operation_type === 'minus' ? -req.litre_qty : req.litre_qty;

      // 2. Update actual stock
      await executeQuery(`
        INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          kg_stock = kg_stock + VALUES(kg_stock),
          litre_stock = litre_stock + VALUES(litre_stock)
      `, [req.tank_id, kgAdj, litreAdj]);

      // 3. Update request status
      await executeQuery(
        "UPDATE manufacturing_tank_stock_requests SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [requestId]
      );

      return NextResponse.json({ success: true, message: "Request approved and stock updated" });
    } else if (action === 'Rejected') {
      await executeQuery(
        "UPDATE manufacturing_tank_stock_requests SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [requestId]
      );
      return NextResponse.json({ success: true, message: "Request rejected" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing stock request approval:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process approval" },
      { status: 500 }
    );
  }
}
