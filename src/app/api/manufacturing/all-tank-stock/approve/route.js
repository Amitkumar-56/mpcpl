import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    if (action === 'Approved') {
      // 1. Get the request details
      const reqRows = await executeQuery("SELECT * FROM manufacturing_tank_stock_requests WHERE id = ?", [requestId]);
      if (reqRows.length === 0) throw new Error("Request not found");
      
      const req = reqRows[0];

      // 2. Update the actual stock (UPSERT)
      const upsertQuery = `
        INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          kg_stock = kg_stock + VALUES(kg_stock),
          litre_stock = litre_stock + VALUES(litre_stock)
      `;
      await executeQuery(upsertQuery, [req.tank_id, req.kg_qty, req.litre_qty]);

      // 3. Mark request as Approved
      await executeQuery("UPDATE manufacturing_tank_stock_requests SET status = 'Approved' WHERE id = ?", [requestId]);
    } else {
      // Mark as Rejected
      await executeQuery("UPDATE manufacturing_tank_stock_requests SET status = 'Rejected' WHERE id = ?", [requestId]);
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action} successfully`
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process approval" },
      { status: 500 }
    );
  }
}
