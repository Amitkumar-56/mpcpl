import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const customerId = searchParams.get('customer_id');

    if (!query || !customerId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing query or customer ID' 
      }, { status: 400 });
    }

    console.log('🚗 Searching vehicles for:', query, 'customer:', customerId);

    // Search in customer_vehicles table
    const vehiclesQuery = `
      SELECT 
        id,
        licence_plate,
        vehicle_number,
        driver_name,
        phone,
        driver_number,
        status
      FROM customer_vehicles 
      WHERE customer_id = ? 
        AND (licence_plate LIKE ? OR vehicle_number LIKE ? OR phone LIKE ?)
        AND status = 'active'
      LIMIT 10
    `;

    const searchPattern = `%${query}%`;
    const vehicles = await executeQuery(vehiclesQuery, [
      customerId, 
      searchPattern, 
      searchPattern, 
      searchPattern
    ]);

    console.log('🔍 Found vehicles:', vehicles.length);

    return NextResponse.json({
      success: true,
      vehicles: vehicles || []
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}