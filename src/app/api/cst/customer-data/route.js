import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch all product codes for the dropdown
    const rows = await executeQuery(
      `SELECT 
        pc.id, 
        pc.pcode, 
        pc.product_id,
        p.pname as product_name
       FROM product_codes pc
       LEFT JOIN products p ON pc.product_id = p.id
       ORDER BY pc.pcode`
    );

    console.log('📦 Product codes fetched:', rows.length);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}