import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Ensure the stock table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_tank_stocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tank_id INT NOT NULL,
        kg_stock DECIMAL(15, 2) DEFAULT 0.00,
        litre_stock DECIMAL(15, 2) DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_tank (tank_id)
      );
    `);

    // Fetch all tanks with their stocks
    const query = `
      SELECT 
        t.id as tank_id,
        t.name as tank_name,
        COALESCE(s.kg_stock, 0) as kg_stock,
        COALESCE(s.litre_stock, 0) as litre_stock
      FROM manufacturing_tanks t
      LEFT JOIN manufacturing_tank_stocks s ON t.id = s.tank_id
      ORDER BY t.name ASC
    `;

    const results = await executeQuery(query);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching tank stock data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tank stock data" },
      { status: 500 }
    );
  }
}
