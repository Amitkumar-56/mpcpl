// src/app/api/stations/view/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from "next/server";

// GET /api/stations/view?id=1
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Station ID is required" }, { status: 400 });
    }

    // Query station details - FIXED: Remove array destructuring
    const stations = await executeQuery.query(
      `SELECT id, station_name, address, gst_name, gst_number, email, phone, manager, created, status 
       FROM filling_stations WHERE id = ?`,
      [id]
    );

    // Check if we got any results
    if (stations.length === 0) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const station = stations[0];

    // Query related products - FIXED: Remove array destructuring
    const products = await executeQuery.query(
      `SELECT nb.product_id, p.pname, nb.stock
       FROM non_billing_stocks nb
       INNER JOIN product p ON nb.product_id = p.id
       WHERE nb.station_id = ?`,
      [id]
    );

    return NextResponse.json({ station, products });
  } catch (err) {
    console.error("Error fetching station:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}