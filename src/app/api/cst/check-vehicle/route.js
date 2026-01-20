import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicle_number = searchParams.get('vehicle_number');
    const customer_id = searchParams.get('customer_id');

    if (!vehicle_number || !customer_id) {
      return NextResponse.json({
        success: false,
        message: 'Vehicle number and customer ID are required'
      }, { status: 400 });
    }

    // ✅ FIXED: Specify fr.status to avoid ambiguous column error
    const query = `
      SELECT rid, fr.status, created, product, station_name
      FROM filling_requests fr
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      WHERE fr.vehicle_number = ? 
        AND fr.cid = ? 
        AND fr.status IN ('pending', 'approved', 'in_progress')
      ORDER BY created DESC 
      LIMIT 1
    `;

    const rows = await executeQuery(query, [
      vehicle_number.toUpperCase().trim(),
      parseInt(customer_id)
    ]);

    if (rows.length > 0) {
      return NextResponse.json({
        exists: true,
        rid: rows[0].rid,
        status: rows[0].status,
        created: rows[0].created,
        product: rows[0].product,
        station_name: rows[0].station_name
      });
    }

    return NextResponse.json({
      exists: false,
      message: 'No active requests found for this vehicle'
    });

  } catch (error) {
    console.error("Check Vehicle API Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}