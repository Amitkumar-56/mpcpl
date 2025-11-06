import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleNumber = searchParams.get('vehicle_number');
    const customerId = searchParams.get('customer_id');

    if (!vehicleNumber || !customerId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing vehicle number or customer ID' 
      }, { status: 400 });
    }

    console.log('🔎 Checking vehicle status:', vehicleNumber, 'for customer:', customerId);

    // Check for existing pending requests for this vehicle
    const checkQuery = `
      SELECT rid, status, created, product, station_name
      FROM filling_requests fr
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      WHERE fr.vehicle_number = ? 
        AND fr.cid = ? 
        AND fr.status IN ('pending', 'approved', 'in_progress')
      ORDER BY created DESC 
      LIMIT 1
    `;

    const existingRequests = await executeQuery(checkQuery, [
      vehicleNumber.toUpperCase().trim(), 
      customerId
    ]);

    if (existingRequests.length > 0) {
      const request = existingRequests[0];
      return NextResponse.json({
        success: true,
        exists: true,
        rid: request.rid,
        status: request.status,
        created: request.created,
        product: request.product,
        station: request.station_name,
        message: `Vehicle has an existing ${request.status} request`
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      message: 'No existing requests found for this vehicle'
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}