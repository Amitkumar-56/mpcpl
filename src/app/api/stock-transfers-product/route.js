import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT 
        pt.id,
        pt.station_from,
        pt.station_to,
        pt.product_id,
        pt.transfer_quantity,
        pt.status,
        pt.remarks,
        pt.created_at,
        pt.updated_at,
        fs_from.station_name as station_from_name,
        fs_to.station_name as station_to_name,
        p.pname as product_name
      FROM product_transfers pt
      LEFT JOIN filling_stations fs_from ON pt.station_from = fs_from.id
      LEFT JOIN filling_stations fs_to ON pt.station_to = fs_to.id
      LEFT JOIN products p ON pt.product_id = p.id
      ORDER BY pt.id DESC
    `;

    const transfers = await executeQuery(query);
    
    return NextResponse.json({ transfers: transfers || [] });
  } catch (error) {
    console.error("Error fetching product transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch product transfers: " + error.message },
      { status: 500 }
    );
  }
}

