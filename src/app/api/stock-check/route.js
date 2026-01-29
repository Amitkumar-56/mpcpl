import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const station_id = searchParams.get('station_id');
    const product_id = searchParams.get('product_id');

    if (!station_id || !product_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Try different possible column names
    const stockQueries = [
      "SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product_id = ?",
      "SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?",
      "SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND p_id = ?"
    ];

    let stock = 0;
    
    for (const query of stockQueries) {
      try {
        const result = await executeQuery(query, [station_id, product_id]);
        if (result.length > 0) {
          stock = parseFloat(result[0].stock) || 0;
          break;
        }
      } catch (error) {
        // Continue to next query
      }
    }

    return NextResponse.json({ stock });
  } catch (error) {
    console.error("Error checking stock:", error);
    return NextResponse.json({ error: "Failed to check stock" }, { status: 500 });
  }
}