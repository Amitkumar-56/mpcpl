import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Pending';

    const query = `
      SELECT 
        tr.*, 
        st.name as source_tank_name,
        dt.name as dest_tank_name
      FROM manufacturing_tank_transfers tr
      JOIN manufacturing_tanks st ON tr.from_tank_id = st.id
      JOIN manufacturing_tanks dt ON tr.to_tank_id = dt.id
      WHERE tr.status = ?
      ORDER BY tr.created_at DESC
    `;

    const results = await executeQuery(query, [status]);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching tank transfers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { from_tank_id, to_tank_id, kg_qty, litre_qty, remarks } = await request.json();

    if (!from_tank_id || !to_tank_id) {
      return NextResponse.json({ success: false, error: "Source and destination tanks are required" }, { status: 400 });
    }

    if (from_tank_id === to_tank_id) {
      return NextResponse.json({ success: false, error: "Source and destination tanks cannot be the same" }, { status: 400 });
    }

    // Ensure table exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_tank_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_tank_id INT NOT NULL,
        to_tank_id INT NOT NULL,
        kg_qty DECIMAL(15, 2) DEFAULT 0.00,
        litre_qty DECIMAL(15, 2) DEFAULT 0.00,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        remarks TEXT,
        requested_by VARCHAR(255),
        approved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    const result = await executeQuery(`
      INSERT INTO manufacturing_tank_transfers (from_tank_id, to_tank_id, kg_qty, litre_qty, remarks, status)
      VALUES (?, ?, ?, ?, ?, 'Pending')
    `, [from_tank_id, to_tank_id, kg_qty || 0, litre_qty || 0, remarks]);

    return NextResponse.json({
      success: true,
      message: "Transfer request submitted successfully and is pending approval",
      transferId: result.insertId
    });
  } catch (error) {
    console.error("Error creating tank transfer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit transfer request" },
      { status: 500 }
    );
  }
}
