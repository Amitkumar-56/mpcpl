import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { productionId, action } = await request.json(); // action: 'Approved' or 'Rejected'

    if (!productionId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get request details
    const [production] = await executeQuery(
      "SELECT * FROM manufacturing_production_requests WHERE id = ? AND status = 'Pending'",
      [productionId]
    );

    if (!production) {
      return NextResponse.json({ success: false, error: "Production request not found or already processed" }, { status: 404 });
    }

    if (action === 'Rejected') {
      await executeQuery(
        "UPDATE manufacturing_production_requests SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [productionId]
      );
      return NextResponse.json({ success: true, message: "Production request rejected" });
    }

    // ACTION: Approved
    const { from_tank_id, kg_input, litre_input } = production;

    // Get outputs
    const outputs = await executeQuery(
      "SELECT * FROM manufacturing_production_outputs WHERE production_id = ?",
      [productionId]
    );

    try {
      // 2. Deduct input from source tank
      await executeQuery(`
        INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          kg_stock = kg_stock - VALUES(kg_stock),
          litre_stock = litre_stock - VALUES(litre_stock)
      `, [from_tank_id, kg_input, litre_input]);

      // 3. Add each output to its destination tank
      for (const out of outputs) {
        await executeQuery(`
          INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            kg_stock = kg_stock + VALUES(kg_stock),
            litre_stock = litre_stock + VALUES(litre_stock)
        `, [out.to_tank_id, out.kg_output, out.litre_output]);
      }

      // 4. Update status
      await executeQuery(
        "UPDATE manufacturing_production_requests SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [productionId]
      );

      return NextResponse.json({
        success: true,
        message: "Production approved and stocks updated successfully"
      });
    } catch (dbError) {
      console.error("Database error during production approval:", dbError);
      return NextResponse.json({ success: false, error: "Failed to update stocks" }, { status: 500 });
    }

  } catch (error) {
    console.error("Error approving production:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
