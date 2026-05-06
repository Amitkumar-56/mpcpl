import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Pending';

    // Ensure tables exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_production_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_code VARCHAR(50) UNIQUE,
        status ENUM('Pending', 'Process', 'Draft', 'Approved', 'Rejected', 'Completed') DEFAULT 'Pending',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    let query = `
      SELECT 
        pr.*
      FROM manufacturing_production_requests pr
    `;
    let queryParams = [];

    if (status !== 'All') {
      query += ` WHERE pr.status = ?`;
      queryParams.push(status);
    }

    query += ` ORDER BY pr.created_at DESC`;

    const requests = await executeQuery(query, queryParams);

    if (requests.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch inputs and outputs for all requests in bulk to avoid N+1 query problem
    const requestIds = requests.map(r => r.id);
    
    // Fetch all inputs
    const allInputs = await executeQuery(`
      SELECT pi.*, t.name as source_tank_name
      FROM manufacturing_production_inputs pi
      LEFT JOIN manufacturing_tanks t ON pi.from_tank_id = t.id
      WHERE pi.production_id IN (${requestIds.map(() => '?').join(',')})
    `, requestIds);

    // Fetch all outputs
    const allOutputs = await executeQuery(`
      SELECT po.*, t.name as dest_tank_name
      FROM manufacturing_production_outputs po
      LEFT JOIN manufacturing_tanks t ON po.to_tank_id = t.id
      WHERE po.production_id IN (${requestIds.map(() => '?').join(',')})
    `, requestIds);

    // Group inputs and outputs by production_id
    const inputsMap = allInputs.reduce((acc, input) => {
      if (!acc[input.production_id]) acc[input.production_id] = [];
      acc[input.production_id].push(input);
      return acc;
    }, {});

    const outputsMap = allOutputs.reduce((acc, output) => {
      if (!acc[output.production_id]) acc[output.production_id] = [];
      acc[output.production_id].push(output);
      return acc;
    }, {});

    // Combine into final results
    const results = requests.map(req => ({
      ...req,
      inputs: inputsMap[req.id] || [],
      outputs: outputsMap[req.id] || []
    }));

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching production requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch production data: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { inputs, outputs, remarks, status } = await request.json();

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return NextResponse.json({ success: false, error: "At least one source tank input is required" }, { status: 400 });
    }

    if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
      return NextResponse.json({ success: false, error: "At least one output product is required" }, { status: 400 });
    }

    // Ensure tables exist
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_production_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        status ENUM('Pending', 'Process', 'Draft', 'Approved', 'Rejected', 'Completed') DEFAULT 'Pending',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Add batch_code if it doesn't exist
    try {
      await executeQuery(`ALTER TABLE manufacturing_production_requests ADD COLUMN batch_code VARCHAR(50) UNIQUE AFTER id`);
    } catch (e) {
      // Column might already exist
    }

    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_production_inputs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        production_id INT NOT NULL,
        from_tank_id INT NOT NULL,
        kg_input DECIMAL(15, 2) DEFAULT 0.00,
        litre_input DECIMAL(15, 2) DEFAULT 0.00,
        FOREIGN KEY (production_id) REFERENCES manufacturing_production_requests(id) ON DELETE CASCADE
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

    // Add product_type if it doesn't exist
    try {
      await executeQuery(`ALTER TABLE manufacturing_production_outputs ADD COLUMN product_type VARCHAR(100) AFTER to_tank_id`);
    } catch (e) {
      // Column might already exist
    }

    // Generate batch code
    const batchCode = `BATCH-${Date.now().toString().slice(-6)}`;

    // 1. Insert Request
    const result = await executeQuery(`
      INSERT INTO manufacturing_production_requests (batch_code, remarks, status)
      VALUES (?, ?, ?)
    `, [batchCode, remarks, status || 'Pending']);

    const productionId = result.insertId;

    // 2. Insert Inputs
    for (const input of inputs) {
      await executeQuery(`
        INSERT INTO manufacturing_production_inputs (production_id, from_tank_id, kg_input, litre_input)
        VALUES (?, ?, ?, ?)
      `, [productionId, input.from_tank_id, input.kg_input || 0, input.litre_input || 0]);

      // If status is 'Process' or 'Approved', deduct stock
      if (status === 'Process' || status === 'Approved' || status === 'Completed') {
        await executeQuery(`
          UPDATE manufacturing_tank_stocks 
          SET kg_stock = kg_stock - ?, litre_stock = litre_stock - ? 
          WHERE tank_id = ?
        `, [input.kg_input || 0, input.litre_input || 0, input.from_tank_id]);

        // Also deduct from active tank allocation
        await executeQuery(`
          UPDATE tank_allocation
          SET current_quantity_kg = current_quantity_kg - ?,
              current_quantity_litre = current_quantity_litre - ?
          WHERE tank_id = ? AND status = 'active'
        `, [input.kg_input || 0, input.litre_input || 0, input.from_tank_id]);
      }
    }

    // 3. Insert Outputs
    for (const output of outputs) {
      await executeQuery(`
        INSERT INTO manufacturing_production_outputs (production_id, to_tank_id, product_type, kg_output, litre_output)
        VALUES (?, ?, ?, ?, ?)
      `, [productionId, output.to_tank_id, output.product_type || 'Unknown', output.kg_output || 0, output.litre_output || 0]);

      // If status is 'Completed', add stock to destination tanks
      if (status === 'Completed' || status === 'Process') {
        await executeQuery(`
          INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock) 
          VALUES (?, ?, ?) 
          ON DUPLICATE KEY UPDATE 
          kg_stock = kg_stock + VALUES(kg_stock), 
          litre_stock = litre_stock + VALUES(litre_stock)
        `, [output.to_tank_id, output.kg_output || 0, output.litre_output || 0]);

        // Also add to active tank allocation
        await executeQuery(`
          UPDATE tank_allocation
          SET current_quantity_kg = current_quantity_kg + ?,
              current_quantity_litre = current_quantity_litre + ?
          WHERE tank_id = ? AND status = 'active'
        `, [output.kg_output || 0, output.litre_output || 0, output.to_tank_id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Production request submitted successfully",
      productionId,
      batchCode
    });
  } catch (error) {
    console.error("Error creating production request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit production request: " + error.message },
      { status: 500 }
    );
  }
}
