import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 Checking stock table structure and data...");
    
    // Check if stock table exists and get its structure
    const tableInfo = await executeQuery(`
      DESCRIBE stock
    `);
    
    console.log("📋 Stock table structure:", tableInfo);
    
    // Get all stock records
    const stockRecords = await executeQuery(`
      SELECT id, invoice_number, created_at 
      FROM stock 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log("📦 Stock records:", stockRecords);
    
    // Get total count
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM stock
    `);
    
    console.log("📊 Total stock records:", countResult[0]?.total || 0);
    
    return NextResponse.json({
      success: true,
      table_structure: tableInfo,
      records: stockRecords,
      total: countResult[0]?.total || 0,
      message: `Found ${countResult[0]?.total || 0} stock records`
    });

  } catch (error) {
    console.error("❌ Error checking stock:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
