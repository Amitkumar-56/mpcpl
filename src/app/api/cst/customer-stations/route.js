import { getConnection } from "@/lib/db";
import { NextResponse } from "next/server";

async function getConnWithRetry(retries = 3, delayMs = 300) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await getConnection();
      return conn;
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || "");
      if (err?.code === "ER_CON_COUNT_ERROR" || msg.includes("Too many connections")) {
        await new Promise(res => setTimeout(res, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

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

    const connection = await getConnWithRetry();
    try {
    const customerQuery = `
      SELECT name, blocklocation 
      FROM customers 
      WHERE id = ?
    `;
      const [customerResult] = await connection.execute(customerQuery, [customerId]);

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
      const [stations] = await connection.execute(stationsQuery, stationIds);

    console.log("🏭 Found stations:", stations);

    return NextResponse.json({
      success: true,
      stations: stations || [],
      customer: {
        name: customerName,
        station_id: blocklocation,
      },
    });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("❌ Stations API Error:", error);
    return NextResponse.json(
      { success: false, message: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
