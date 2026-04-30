import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Pending';

    const query = `
      SELECT 
        r.*, 
        t.name as tank_name
      FROM manufacturing_tank_stock_requests r
      JOIN manufacturing_tanks t ON r.tank_id = t.id
      WHERE r.status = ?
      ORDER BY r.created_at DESC
    `;

    const results = await executeQuery(query, [status]);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching stock requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stock requests" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { tank_id, kg_qty, litre_qty, remarks, operation_type } = await request.json();

    if (!tank_id) {
      return NextResponse.json({ success: false, error: "Tank ID is required" }, { status: 400 });
    }

    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_tank_stock_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tank_id INT NOT NULL,
        kg_qty DECIMAL(15, 2) DEFAULT 0.00,
        litre_qty DECIMAL(15, 2) DEFAULT 0.00,
        operation_type ENUM('plus', 'minus') DEFAULT 'plus',
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        remarks TEXT,
        requested_by VARCHAR(255),
        approved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    const result = await executeQuery(`
      INSERT INTO manufacturing_tank_stock_requests (tank_id, kg_qty, litre_qty, operation_type, remarks, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `, [tank_id, kg_qty || 0, litre_qty || 0, operation_type || 'plus', remarks]);

    return NextResponse.json({
      success: true,
      message: "Stock request submitted successfully and is pending approval",
      requestId: result.insertId
    });
  } catch (error) {
    console.error("Error creating stock request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit stock request" },
      { status: 500 }
    );
  }
}
