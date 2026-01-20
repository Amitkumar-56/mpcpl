import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 Fetching stock transfers...");
    
    const query = `
      SELECT 
        st.id, 
        st.station_from, 
        st.station_to, 
        st.driver_id, 
        st.vehicle_id, 
        st.transfer_quantity, 
        st.status,
        st.created_at,
        st.product,
        fs_from.station_name as station_from_name,
        fs_to.station_name as station_to_name,
        p.pname as product_name,
        ep.name as driver_name,
        v.licence_plate as vehicle_no,
        v.vehicle_name as vehicle_name
      FROM stock_transfers st
      LEFT JOIN filling_stations fs_from ON st.station_from = fs_from.id
      LEFT JOIN filling_stations fs_to ON st.station_to = fs_to.id
      LEFT JOIN products p ON st.product = p.id
      LEFT JOIN employee_profile ep ON st.driver_id = ep.id
      LEFT JOIN vehicles v ON st.vehicle_id = v.id
      ORDER BY st.id DESC
    `;

    const transfers = await executeQuery(query);
    console.log("📊 Transfers fetched:", transfers?.length);
    
    return NextResponse.json({ transfers: transfers || [] });
  } catch (error) {
    console.error("❌ Error fetching stock transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock transfers: " + error.message },
      { status: 500 }
    );
  }
}

