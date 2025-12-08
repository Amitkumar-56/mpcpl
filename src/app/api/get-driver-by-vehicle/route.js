// src/app/api/get-driver-by-vehicle/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleNo = searchParams.get("vehicle_no");

    if (!vehicleNo) {
      return NextResponse.json(
        { error: "Vehicle number is required" },
        { status: 400 }
      );
    }

    // Fetch driver information based on vehicle number
    // Using the same query structure as /api/vehicles route
    // vehicles.driver_id = employee_profile.id (relationship)
    const trimmedVehicleNo = vehicleNo.trim();
    console.log("🔍 Fetching driver for vehicle:", trimmedVehicleNo);
    
    // Same query structure as vehicles API - Plate and Driver
    const result = await executeQuery(`
      SELECT 
        v.id, 
        v.com_id, 
        v.vehicle_name, 
        v.licence_plate, 
        v.phone, 
        v.status, 
        v.driver_id,
        e.name as driver_name
      FROM vehicles v
      LEFT JOIN employee_profile e ON v.driver_id = e.id
      WHERE TRIM(UPPER(v.licence_plate)) = TRIM(UPPER(?))
    `, [trimmedVehicleNo]);

    console.log("📊 Query result:", result);

    if (result.length === 0) {
      console.log("❌ Vehicle not found:", vehicleNo);
      return NextResponse.json(
        { 
          success: false,
          error: "Vehicle not found",
          vehicle_no: vehicleNo
        },
        { status: 404 }
      );
    }

    const vehicle = result[0];
    console.log("✅ Vehicle found:", vehicle);
    console.log("🏷️ Plate:", vehicle.licence_plate);
    console.log("👤 Driver ID:", vehicle.driver_id);
    console.log("👤 Driver Name:", vehicle.driver_name);

    return NextResponse.json({
      success: true,
      id: vehicle.id,
      vehicle_no: vehicle.licence_plate, // Plate
      vehicle_name: vehicle.vehicle_name,
      driver_id: vehicle.driver_id, // This is the id from employee_profile
      driver_name: vehicle.driver_name || null, // Driver name from employee_profile
      phone: vehicle.phone,
      status: vehicle.status,
      has_driver: !!vehicle.driver_id
    });
  } catch (error) {
    console.error("Error fetching driver by vehicle:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver information" },
      { status: 500 }
    );
  }
}

