// src/app/api/get-vehicles/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch vehicles with driver information
    // vehicles.driver_id = employee_profile.id (relationship)
    const vehicles = await executeQuery(`
      SELECT 
        v.id, 
        v.licence_plate, 
        v.vehicle_name,
        v.driver_id,
        e.name as driver_name
      FROM vehicles v
      LEFT JOIN employee_profile e ON v.driver_id = e.id
      ORDER BY v.licence_plate
    `);

    return NextResponse.json({ 
      vehicles: vehicles || []
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

