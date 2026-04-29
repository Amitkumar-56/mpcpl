import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const tanks = await executeQuery("SELECT * FROM manufacturing_tanks ORDER BY name ASC");
    return NextResponse.json(tanks);
  } catch (error) {
    console.error("Error fetching tanks:", error);
    return NextResponse.json({ error: "Failed to fetch tanks" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Tank name is required" }, { status: 400 });
    }

    // Ensure table exists (as a fallback since we can't run CLI commands easily)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS manufacturing_tanks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    const result = await executeQuery(
      "INSERT INTO manufacturing_tanks (name) VALUES (?)",
      [name.trim()]
    );

    return NextResponse.json({
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
