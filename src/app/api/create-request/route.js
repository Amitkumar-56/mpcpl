import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch ONLY 4 specific product codes for dropdown
    const rows = await executeQuery(
      `SELECT 
        pc.id, 
        pc.pcode, 
        pc.product_id,
        p.pname as product_name
       FROM product_codes pc
       LEFT JOIN products p ON pc.product_id = p.id
       WHERE pc.product_id IN (2, 3, 4, 5)
       ORDER BY pc.product_id, pc.pcode`
    );

    console.log('📦 Product codes fetched (4 specific products):', rows.length);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}