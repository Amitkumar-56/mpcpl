import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Missing customer ID" },
        { status: 400 }
      );
    }

    console.log("👤 Fetching stations for customer:", customerId);

    const customerQuery = `
      SELECT name, blocklocation 
      FROM customers 
      WHERE id = ?
    `;
    const customerResult = await executeQuery(customerQuery, [customerId]);

    if (customerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    const { name: customerName, blocklocation } = customerResult[0];

    if (!blocklocation || blocklocation.trim() === "") {
      return NextResponse.json({
        success: true,
        stations: [],
        customer: { name: customerName, station_id: "" },
      });
    }

    const stationIds = blocklocation
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "");

    console.log("📍 Station IDs for customer:", stationIds);

    if (stationIds.length === 0) {
      return NextResponse.json({
        success: true,
        stations: [],
        customer: { name: customerName, station_id: blocklocation },
      });
    }

    const placeholders = stationIds.map(() => "?").join(",");
    const stationsQuery = `
      SELECT id, station_name 
      FROM filling_stations 
      WHERE id IN (${placeholders})
      ORDER BY station_name
    `;
    const stations = await executeQuery(stationsQuery, stationIds);

    console.log("🏭 Found stations:", stations);

    return NextResponse.json({
      success: true,
      stations: stations || [],
      customer: {
        name: customerName,
        station_id: blocklocation,
      },
    });
  } catch (error) {
    console.error("❌ Stations API Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}