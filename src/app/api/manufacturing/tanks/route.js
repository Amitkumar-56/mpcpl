import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

let tableEnsured = false;

const ensureTable = async () => {
  if (tableEnsured) return;
  
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS manufacturing_tanks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      unit VARCHAR(50) DEFAULT 'KG',
      capacity_kg DECIMAL(15, 2) DEFAULT 0.00,
      capacity_litre DECIMAL(15, 2) DEFAULT 0.00,
      tank_type VARCHAR(100) DEFAULT 'General',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Migration: Ensure all columns exist
  const columns = await executeQuery(`SHOW COLUMNS FROM manufacturing_tanks`);
  const colNames = columns.map(c => c.Field);
  
  if (!colNames.includes('unit')) {
    await executeQuery(`ALTER TABLE manufacturing_tanks ADD COLUMN unit VARCHAR(50) DEFAULT 'KG'`);
  }
  if (!colNames.includes('capacity_kg')) {
    await executeQuery(`ALTER TABLE manufacturing_tanks ADD COLUMN capacity_kg DECIMAL(15, 2) DEFAULT 0.00`);
  }
  if (!colNames.includes('capacity_litre')) {
    await executeQuery(`ALTER TABLE manufacturing_tanks ADD COLUMN capacity_litre DECIMAL(15, 2) DEFAULT 0.00`);
  }
  if (!colNames.includes('tank_type')) {
    await executeQuery(`ALTER TABLE manufacturing_tanks ADD COLUMN tank_type VARCHAR(100) DEFAULT 'General'`);
  }
  
  tableEnsured = true;
};

export async function GET() {
  try {
    await ensureTable();
    const tanks = await executeQuery("SELECT * FROM manufacturing_tanks ORDER BY name ASC");
    return NextResponse.json(tanks);
  } catch (error) {
    console.error("Error fetching tanks:", error);
    return NextResponse.json({ error: "Failed to fetch tanks" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureTable();
    const { name, unit, capacity_kg, capacity_litre, tank_type } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Tank name is required" }, { status: 400 });
    }

    const result = await executeQuery(
      "INSERT INTO manufacturing_tanks (name, unit, capacity_kg, capacity_litre, tank_type) VALUES (?, ?, ?, ?, ?)",
      [
        name.trim(), 
        unit || 'KG', 
        parseFloat(capacity_kg) || 0.00, 
        parseFloat(capacity_litre) || 0.00, 
        tank_type || 'General'
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Tank created successfully",
      id: result.insertId,
      name: name.trim(),
    });
  } catch (error) {
    console.error("Error creating tank:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Tank name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create tank" }, { status: 500 });
  }
}
