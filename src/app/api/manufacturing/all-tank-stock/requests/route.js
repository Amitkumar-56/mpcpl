import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Pending';
    const tankId = searchParams.get('tankId');

    let query = `
      SELECT 
        r.*,
        t.name as tank_name
      FROM manufacturing_tank_stock_requests r
      JOIN manufacturing_tanks t ON r.tank_id = t.id
      WHERE r.status = ?
    `;
    const params = [status];

    if (tankId) {
      query += " AND r.tank_id = ?";
      params.push(tankId);
    }

    query += " ORDER BY r.created_at DESC";

    const results = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching stock requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stock requests" },
      { status: 500 }
    );
  }
}
