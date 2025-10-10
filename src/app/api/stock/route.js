// src/app/api/stock/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT 
        fs.station_name,
        p.pname AS product_name,
        s.stock
      FROM stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      ORDER BY fs.station_name ASC, p.pname ASC
    `;
    const data = await executeQuery({ query });
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}