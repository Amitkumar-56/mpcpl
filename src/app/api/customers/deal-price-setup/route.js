import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ✅ Fetch all sub-products (product_codes table)
    const products = await executeQuery(`
      SELECT 
        pc.id AS sub_product_id,
        pc.product_id,
        pc.pcode,
        p.pname AS product_name
      FROM product_codes pc
      LEFT JOIN products p ON pc.product_id = p.id
      ORDER BY pc.id ASC
    `);

    // ✅ Fetch all stations
    const stations = await executeQuery(`
      SELECT id, station_name
      FROM filling_stations
      WHERE status = 1
      ORDER BY id ASC
    `);

    return NextResponse.json({
      success: true,
      products,
      stations,
    });
  } catch (error) {
    console.error("Error fetching setup data:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
