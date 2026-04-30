import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { tank_id, kg_quantity, litre_quantity, operation_type, remarks } = await request.json();

    if (!tank_id) {
      return NextResponse.json({ success: false, error: "Tank ID is required" }, { status: 400 });
    }

    const kgQty = parseFloat(kg_quantity) || 0;
    const litreQty = parseFloat(litre_quantity) || 0;

    if (kgQty === 0 && litreQty === 0) {
      return NextResponse.json({ success: false, error: "Quantity is required" }, { status: 400 });
    }

    // Determine final adjustment values based on operation type
    const kgAdj = operation_type === 'minus' ? -kgQty : kgQty;
    const litreAdj = operation_type === 'minus' ? -litreQty : litreQty;

    // Use ON DUPLICATE KEY UPDATE to handle both insert and update
    await executeQuery(`
      INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        kg_stock = kg_stock + VALUES(kg_stock),
        litre_stock = litre_stock + VALUES(litre_stock)
    `, [tank_id, kgAdj, litreAdj]);

    // Log the transaction (optional but recommended)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_tank_stock_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tank_id INT NOT NULL,
        kg_change DECIMAL(15, 2),
        litre_change DECIMAL(15, 2),
        operation_type ENUM('plus', 'minus'),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await executeQuery(`
      INSERT INTO manufacturing_tank_stock_logs (tank_id, kg_change, litre_change, operation_type, remarks)
      VALUES (?, ?, ?, ?, ?)
    `, [tank_id, kgQty, litreQty, operation_type, remarks || "Stock updated"]);

    return NextResponse.json({
      success: true,
      message: `Stock ${operation_type === 'minus' ? 'deducted' : 'added'} successfully`
    });
  } catch (error) {
    console.error("Error updating tank stock:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update tank stock" },
      { status: 500 }
    );
  }
}
