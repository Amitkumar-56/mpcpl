import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Pending';

    const query = `
      SELECT 
        pr.*, 
        t.name as source_tank_name
      FROM manufacturing_production_requests pr
      JOIN manufacturing_tanks t ON pr.from_tank_id = t.id
      WHERE pr.status = ?
      ORDER BY pr.created_at DESC
    `;

    const requests = await executeQuery(query, [status]);

    // Fetch outputs for each request
    const requestsWithOutputs = await Promise.all(requests.map(async (req) => {
      const outputs = await executeQuery(`
        SELECT po.*, t.name as dest_tank_name
        FROM manufacturing_production_outputs po
        JOIN manufacturing_tanks t ON po.to_tank_id = t.id
        WHERE po.production_id = ?
      `, [req.id]);
      return { ...req, outputs };
    }));

    return NextResponse.json({
      success: true,
      data: requestsWithOutputs
    });
  } catch (error) {
    console.error("Error fetching production requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch production data" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { from_tank_id, kg_input, litre_input, outputs, remarks } = await request.json();

    if (!from_tank_id || (!kg_input && !litre_input)) {
      return NextResponse.json({ success: false, error: "Source tank and input quantity are required" }, { status: 400 });
    }

    if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
      return NextResponse.json({ success: false, error: "At least one output product is required" }, { status: 400 });
    }

    // Ensure tables exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_production_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_tank_id INT NOT NULL,
        kg_input DECIMAL(15, 2) DEFAULT 0.00,
        litre_input DECIMAL(15, 2) DEFAULT 0.00,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_production_outputs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        production_id INT NOT NULL,
        to_tank_id INT NOT NULL,
        kg_output DECIMAL(15, 2) DEFAULT 0.00,
        litre_output DECIMAL(15, 2) DEFAULT 0.00,
        FOREIGN KEY (production_id) REFERENCES manufacturing_production_requests(id) ON DELETE CASCADE
      );
    `);

    // 1. Insert Request
    const result = await executeQuery(`
      INSERT INTO manufacturing_production_requests (from_tank_id, kg_input, litre_input, remarks, status)
      VALUES (?, ?, ?, ?, 'Pending')
    `, [from_tank_id, kg_input || 0, litre_input || 0, remarks]);

    const productionId = result.insertId;

    // 2. Insert Outputs
    for (const output of outputs) {
      await executeQuery(`
        INSERT INTO manufacturing_production_outputs (production_id, to_tank_id, kg_output, litre_output)
        VALUES (?, ?, ?, ?)
      `, [productionId, output.to_tank_id, output.kg_output || 0, output.litre_output || 0]);
    }

    return NextResponse.json({
      success: true,
      message: "Production request submitted successfully",
      productionId
    });
  } catch (error) {
    console.error("Error creating production request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit production request" },
      { status: 500 }
    );
  }
}
