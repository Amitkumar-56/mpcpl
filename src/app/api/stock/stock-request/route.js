
// src/app/api/stock/stock-request/route.js
import { executeQuery } from "@/lib/db"; // your DB helper
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch all stock requests
    const stockRequests = await executeQuery({
      query: "SELECT * FROM stock ORDER BY id DESC",
    });

    // For each stock request, fetch related data
    const enhancedRequests = await Promise.all(
      stockRequests.map(async (row) => {
        // Get product name
        const product = await executeQuery({
          query: "SELECT pname FROM product WHERE id = ?",
          values: [row.product_id],
        });

        // Get supplier name
        const supplier = await executeQuery({
          query: "SELECT name FROM supplier WHERE id = ?",
          values: [row.supplier_id],
        });

        // Get transporter name
        const transporter = await executeQuery({
          query: "SELECT transporter_name FROM transporters WHERE id = ?",
          values: [row.transporter_id],
        });

        // Get station name
        const station = await executeQuery({
          query: "SELECT station_name FROM filling_stations WHERE id = ?",
          values: [row.fs_id],
        });

        return {
          ...row,
          product_name: product[0]?.pname || "Product not found",
          supplier_name: supplier[0]?.name || "No Supplier",
          transporter_name: transporter[0]?.transporter_name || "No Transporter",
          station_name: station[0]?.station_name || "Station not found",
        };
      })
    );

    return NextResponse.json(enhancedRequests);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stock requests" }, { status: 500 });
  }
}
