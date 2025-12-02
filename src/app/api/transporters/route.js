// src/app/api/transporters/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// ✅ GET all transporters with payable sum
export async function GET() {
  try {
    // First check if transporters table exists and has data
    const checkTable = await executeQuery(`SHOW TABLES LIKE 'transporters'`);
    if (checkTable.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Try to get transporters with payable sum
    let results;
    try {
      results = await executeQuery(
        `SELECT 
           t.id,
           t.transporter_name,
           t.email,
           t.phone,
           t.address,
           COALESCE(SUM(s.t_payable), 0) AS total_payable
         FROM transporters t
         LEFT JOIN stock s ON s.transporter_id = t.id
         GROUP BY t.id, t.transporter_name, t.email, t.phone, t.address
         ORDER BY t.id DESC`
      );
    } catch (joinError) {
      // If join fails, just get transporters without stock info
      console.log("⚠️ Join with stock table failed, fetching transporters only:", joinError.message);
      results = await executeQuery(
        `SELECT 
           id,
           transporter_name,
           email,
           phone,
           address,
           0 AS total_payable
         FROM transporters
         ORDER BY id DESC`
      );
    }

    const response = NextResponse.json({ success: true, data: results || [] });
    response.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    console.error("Error fetching transporters:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: "Failed to load transporters. Please check database connection."
    }, { status: 500 });
  }
}
