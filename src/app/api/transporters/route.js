// src/app/api/transporters/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// ✅ GET all transporters with payable sum
export async function GET() {
  try {
    const results = await executeQuery(
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

    const response = NextResponse.json({ success: true, data: results });
    response.headers.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    console.error("Error fetching transporters:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
