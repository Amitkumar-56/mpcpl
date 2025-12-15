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

    // Search in vehicles table using com_id (customer_id)
    // Map customer_id to com_id in vehicles table
    const vehiclesQuery = `
      SELECT 
        v.id,
        v.licence_plate as licence_plate,
        v.licence_plate as vehicle_number,
        e.name as driver_name,
        v.phone,
        v.phone as driver_number,
        v.status
      FROM vehicles v
      LEFT JOIN employee_profile e ON v.driver_id = e.id
      WHERE v.com_id = ? 
        AND (v.licence_plate LIKE ? OR v.phone LIKE ?)
        AND v.status = 'active'
      LIMIT 10
    `;

    const searchPattern = `%${query}%`;
    const vehicles = await executeQuery(vehiclesQuery, [
      customerId, 
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