import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { transferId, action } = await request.json(); // action: 'Approved' or 'Rejected'

    if (!transferId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!['Approved', 'Rejected'].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    // 1. Get transfer details
    const [transfer] = await executeQuery(
      "SELECT * FROM manufacturing_tank_transfers WHERE id = ? AND status = 'Pending'",
      [transferId]
    );

    if (!transfer) {
      return NextResponse.json({ success: false, error: "Transfer request not found or already processed" }, { status: 404 });
    }

    if (action === 'Rejected') {
      await executeQuery(
        "UPDATE manufacturing_tank_transfers SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [transferId]
      );
      return NextResponse.json({ success: true, message: "Transfer request rejected" });
    }

    // ACTION: Approved
    const { from_tank_id, to_tank_id, kg_qty, litre_qty } = transfer;

    // Use a transaction or sequential updates
    // For simplicity with the existing executeQuery wrapper, we do it sequentially.
    // In a real production app, use a transaction.
    
    try {
      // 2. Deduct from source tank
      await executeQuery(`
        INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          kg_stock = kg_stock - VALUES(kg_stock),
          litre_stock = litre_stock - VALUES(litre_stock)
      `, [from_tank_id, kg_qty, litre_qty]);

      // 3. Add to destination tank
      await executeQuery(`
        INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          kg_stock = kg_stock + VALUES(kg_stock),
          litre_stock = litre_stock + VALUES(litre_stock)
      `, [to_tank_id, kg_qty, litre_qty]);

      // 4. Update transfer status
      await executeQuery(
        "UPDATE manufacturing_tank_transfers SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [transferId]
      );

      return NextResponse.json({
        success: true,
        message: "Transfer approved and inventory updated successfully"
      });
    } catch (dbError) {
      console.error("Database error during transfer approval:", dbError);
      return NextResponse.json({ success: false, error: "Failed to update inventory during approval" }, { status: 500 });
    }

  } catch (error) {
    console.error("Error approving tank transfer:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
