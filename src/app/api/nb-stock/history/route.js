// src/app/api/nb-stock/history/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const station_id = searchParams.get('station_id');
    const product_id = searchParams.get('product_id');

    if (!station_id || !product_id) {
      return NextResponse.json(
        { success: false, error: "Station ID and Product ID are required" },
        { status: 400 }
      );
    }

    // Get outward transactions from filling_history for non-billing customers
    // Join with filling_requests to get customer info, and check if customer is non-billing (billing_type = 2)
    const query = `
      SELECT 
        fh.id,
        fh.rid,
        fh.filling_qty as outward_qty,
        fh.amount,
        fh.filling_date,
        fh.created_by,
        fh.trans_type,
        fs.station_name,
        p.pname as product_name,
        c.name as customer_name,
        c.id as customer_id,
        COALESCE(ep.name, 'Unknown') as employee_name,
        fr.vehicle_number,
        fr.completed_date,
        CASE WHEN fh.filling_date IS NOT NULL THEN DATE_FORMAT(fh.filling_date, '%d/%m/%Y') ELSE NULL END as formatted_date,
        CASE WHEN fh.filling_date IS NOT NULL THEN DATE_FORMAT(fh.filling_date, '%h:%i %p') ELSE NULL END as formatted_time,
        DATE(fh.filling_date) as log_date,
        TIME(fh.filling_date) as log_time
      FROM filling_history fh
      LEFT JOIN filling_requests fr ON fh.rid = fr.rid
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN filling_stations fs ON fh.fs_id = fs.id
      LEFT JOIN products p ON fh.product_id = p.id
      LEFT JOIN employee_profile ep ON fh.created_by = ep.id
      WHERE fh.fs_id = ? 
        AND fh.product_id = ?
        AND fh.trans_type = 'Outward'
        AND c.billing_type = 2
      ORDER BY fh.filling_date DESC, fh.id DESC
    `;

    const results = await executeQuery(query, [station_id, product_id]);

    return NextResponse.json({ 
      success: true, 
      data: results 
    });
  } catch (error) {
    console.error("Error fetching NB stock history:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

