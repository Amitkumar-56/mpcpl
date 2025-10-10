// src/app/api/nb-stock/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT 
        n.station_id, 
        f.station_name, 
        n.product_id, 
        p.pname, 
        n.stock
      FROM non_billing_stocks n
      JOIN filling_stations f ON n.station_id = f.id
      JOIN product p ON n.product_id = p.id
      ORDER BY n.station_id DESC
    `;

    const results = await executeQuery({ query });
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching Non-Billing Stocks:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}