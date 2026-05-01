import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

const ensureTables = async () => {
  // Ensure the tanks table exists first
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS manufacturing_tanks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      unit VARCHAR(50) DEFAULT 'KG/LTR',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

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

  // Ensure the requests table exists
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS manufacturing_tank_stock_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tank_id INT NOT NULL,
      kg_qty DECIMAL(15, 2) DEFAULT 0.00,
      litre_qty DECIMAL(15, 2) DEFAULT 0.00,
      eway_bill_no VARCHAR(255),
      eway_bill_expiry DATE,
      invoice_no VARCHAR(255),
      invoice_date DATE,
      density DECIMAL(10, 4),
      tanker_no VARCHAR(255),
      driver_no VARCHAR(255),
      status VARCHAR(20) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Migration: Handle column changes
  const columns = await executeQuery(`SHOW COLUMNS FROM manufacturing_tank_stock_requests`);
  const colNames = columns.map(c => c.Field);
  
  // Drop old columns that are no longer needed
  const colsToDrop = ['type', 'remarks'];
  for (const col of colsToDrop) {
    if (colNames.includes(col)) {
      try {
        await executeQuery(`ALTER TABLE manufacturing_tank_stock_requests DROP COLUMN ${col}`);
      } catch (error) {
        console.log(`Column ${col} drop failed (may not exist):`, error.message);
      }
    }
  }
  
  // Add missing columns if they don't exist
  const newCols = [
    { name: 'eway_bill_no', type: 'VARCHAR(255)' },
    { name: 'eway_bill_expiry', type: 'DATE' },
    { name: 'invoice_no', type: 'VARCHAR(255)' },
    { name: 'invoice_date', type: 'DATE' },
    { name: 'density', type: 'DECIMAL(10, 4)' },
    { name: 'tanker_no', type: 'VARCHAR(255)' },
    { name: 'driver_no', type: 'VARCHAR(255)' }
  ];

  for (const col of newCols) {
    if (!colNames.includes(col.name)) {
      await executeQuery(`ALTER TABLE manufacturing_tank_stock_requests ADD COLUMN ${col.name} ${col.type}`);
    }
  }
};

export async function GET() {
  try {
    await ensureTables();

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

export async function POST(request) {
  try {
    await ensureTables();
    const body = await request.json();
    const { 
      tank_id, kg_qty, litre_qty,
      eway_bill_no, eway_bill_expiry, invoice_no, invoice_date,
      density, tanker_no, driver_no 
    } = body;

    if (!tank_id) {
      return NextResponse.json({ success: false, error: "Tank ID is required" }, { status: 400 });
    }

    const query = `
      INSERT INTO manufacturing_tank_stock_requests (
        tank_id, kg_qty, litre_qty, status,
        eway_bill_no, eway_bill_expiry, invoice_no, invoice_date,
        density, tanker_no, driver_no
      )
      VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      Number(tank_id),
      parseFloat(kg_qty) || 0,
      parseFloat(litre_qty) || 0,
      eway_bill_no || null,
      eway_bill_expiry || null,
      invoice_no || null,
      invoice_date || null,
      parseFloat(density) || null,
      tanker_no || null,
      driver_no || null
    ];

    await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      message: "Stock request submitted successfully"
    });
  } catch (error) {
    console.error("Error creating stock request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create stock request: " + error.message },
      { status: 500 }
    );
  }
}
