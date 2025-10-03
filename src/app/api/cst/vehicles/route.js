import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const customer_id = searchParams.get('customer_id');

    if (!query || !customer_id) {
      return NextResponse.json({ success: false, vehicles: [] });
    }

    const vehicles = await executeQuery(
      `SELECT id, licence_plate, phone 
       FROM vehicles 
       WHERE (licence_plate LIKE ? OR phone LIKE ?) AND customer_id = ? 
       LIMIT 10`,
      [`%${query}%`, `%${query}%`, customer_id]
    );

    return NextResponse.json({
      success: true,
      vehicles: vehicles
    });

  } catch (error) {
    console.error('Error in vehicles API:', error);
    return NextResponse.json({ success: false, vehicles: [] });
  }
}