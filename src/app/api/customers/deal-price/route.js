import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { priceUpdates } = body;

    if (!priceUpdates || !priceUpdates.length) {
      return NextResponse.json({ success: false, message: "No price updates provided" }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;

    for (const update of priceUpdates) {
      const { type, data } = update;
      const { com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time } = data;

      if (!com_id || !station_id || !product_id || !sub_product_id || price === undefined) continue;

      if (type === "INSERT") {
        await executeQuery(
          `INSERT INTO deal_price 
           (com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time, updated_date, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,
          [com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time]
        );
        inserted++;
      } else if (type === "UPDATE") {
        const result = await executeQuery(
          `UPDATE deal_price 
           SET price=?, Schedule_Date=?, Schedule_Time=?, updated_date=NOW()
           WHERE com_id=? AND station_id=? AND product_id=? AND sub_product_id=?`,
          [price, Schedule_Date, Schedule_Time, com_id, station_id, product_id, sub_product_id]
        );
        if (result.affectedRows > 0) updated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed successfully: ${inserted} inserted, ${updated} updated`,
      counts: { inserted, updated },
    });
  } catch (error) {
    console.error("Error saving deal prices:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ✅ GET - Fetch existing prices
export async function GET(req) {
  try {
    const customerId = req.nextUrl.searchParams.get("customer_id");
    if (!customerId) return NextResponse.json([]);

    const data = await executeQuery(
      `SELECT dp.*, 
              p.pname AS product_name, 
              pc.pcode AS sub_product_code, 
              s.station_name
       FROM deal_price dp
       LEFT JOIN product_codes pc ON dp.sub_product_id = pc.id
       LEFT JOIN products p ON dp.product_id = p.id
       LEFT JOIN filling_stations s ON dp.station_id = s.id
       WHERE dp.com_id = ? AND dp.is_active = 1`,
      [customerId]
    );

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json([], { status: 500 });
  }
}