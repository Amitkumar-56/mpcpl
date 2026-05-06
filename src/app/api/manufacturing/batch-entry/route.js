import { executeQuery, executeTransaction } from "@/lib/db";
import { NextResponse } from "next/server";

const ensureTables = async () => {
  // Ensure the batches table exists
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS manufacturing_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_name VARCHAR(255) NOT NULL UNIQUE,
      destination_tank_id INT NOT NULL,
      output_kg DECIMAL(15, 2) DEFAULT 0.00,
      output_litre DECIMAL(15, 2) DEFAULT 0.00,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    // Migration: rename batch_number to batch_name if it exists
    const cols = await executeQuery("SHOW COLUMNS FROM manufacturing_batches LIKE 'batch_number'");
    if (cols && cols.length > 0) {
      await executeQuery("ALTER TABLE manufacturing_batches CHANGE batch_number batch_name VARCHAR(255) NOT NULL");
    }
  } catch(e) {
    console.log("Migration error:", e);
  }

  // Ensure the batch inputs table exists
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS manufacturing_batch_inputs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      raw_material_id INT NOT NULL,
      input_kg DECIMAL(15, 2) DEFAULT 0.00,
      input_litre DECIMAL(15, 2) DEFAULT 0.00,
      FOREIGN KEY (batch_id) REFERENCES manufacturing_batches(id) ON DELETE CASCADE
    );
  `);
};

export async function GET() {
  try {
    await ensureTables();
    
    // Fetch all batches with their inputs
    const query = `
      SELECT 
        b.id,
        b.batch_name,
        b.destination_tank_id,
        t.name as destination_tank_name,
        b.output_kg,
        b.output_litre,
        b.remarks,
        b.created_at,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'raw_material_id', i.raw_material_id,
              'raw_material_name', r.name,
              'input_kg', i.input_kg,
              'input_litre', i.input_litre
            )
          )
          FROM manufacturing_batch_inputs i
          LEFT JOIN raw_materials_other r ON i.raw_material_id = r.id
          WHERE i.batch_id = b.id
        ) as inputs
      FROM manufacturing_batches b
      LEFT JOIN manufacturing_tanks t ON b.destination_tank_id = t.id
      ORDER BY b.created_at DESC
    `;

    const results = await executeQuery(query);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch batches" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await ensureTables();
    const body = await request.json();
    const { 
      batch_name, 
      destination_tank_id, 
      output_kg, 
      output_litre, 
      remarks,
      inputs // Array of { raw_material_id, input_kg, input_litre }
    } = body;

    if (!batch_name || !destination_tank_id) {
      return NextResponse.json({ success: false, error: "Batch name and destination tank are required" }, { status: 400 });
    }

    if (!inputs || inputs.length === 0) {
      return NextResponse.json({ success: false, error: "At least one raw material input is required" }, { status: 400 });
    }

    await executeTransaction(async (connection) => {
      // 1. Insert Batch Record
      const [batchResult] = await connection.execute(
        `INSERT INTO manufacturing_batches (batch_name, destination_tank_id, output_kg, output_litre, remarks) 
         VALUES (?, ?, ?, ?, ?)`,
        [batch_name, destination_tank_id, parseFloat(output_kg) || 0, parseFloat(output_litre) || 0, remarks || null]
      );
      
      const batchId = batchResult.insertId;

      // 2. Process Inputs (Deduct from Raw Materials and Insert Batch Inputs)
      for (const input of inputs) {
        const inputKg = parseFloat(input.input_kg) || 0;
        const inputLitre = parseFloat(input.input_litre) || 0;

        // Deduct from raw_materials_other
        await connection.execute(
          `UPDATE raw_materials_other 
           SET stock_kg = stock_kg - ?, stock_litre = stock_litre - ? 
           WHERE id = ?`,
          [inputKg, inputLitre, input.raw_material_id]
        );

        // Record the input
        await connection.execute(
          `INSERT INTO manufacturing_batch_inputs (batch_id, raw_material_id, input_kg, input_litre) 
           VALUES (?, ?, ?, ?)`,
          [batchId, input.raw_material_id, inputKg, inputLitre]
        );
      }

      // 3. Add to Destination Tank (manufacturing_tank_stocks)
      await connection.execute(
        `INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         kg_stock = kg_stock + VALUES(kg_stock), 
         litre_stock = litre_stock + VALUES(litre_stock)`,
        [destination_tank_id, parseFloat(output_kg) || 0, parseFloat(output_litre) || 0]
      );
    });

    return NextResponse.json({
      success: true,
      message: "Batch created successfully and stock updated"
    });
  } catch (error) {
    console.error("Error creating batch:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { success: false, error: "Batch name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create batch: " + error.message },
      { status: 500 }
    );
  }
}
