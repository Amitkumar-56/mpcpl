// src/app/api/stock/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const query = `
      SELECT 
        s.id,
        s.supplier_id,
        s.product_id,
        s.fs_id,
        s.invoice_number,
        s.invoice_date,
  
        s.density,
        s.kg,
        s.ltr,
        s.tanker_no,
        s.driver_no,
        s.lr_no,
        s.v_invoice_value,
        s.dncn,
        s.t_dncn,
        s.payable,
        s.t_payable,
        s.payment,
        s.t_payment,
        s.status,
        s.weight_type,
        s.quantity_change_reason,
        s.quantity_changed,
        s.created_at,
        -- Join with suppliers table to get supplier name
        sup.name as supplier_name,
        -- Join with products table to get product name
        p.pname as product_name,
        -- Join with filling_stations table to get station name
        fs.station_name as station_name,
        fs.fl_id,
        fs.fa_id
      FROM stock s
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      ORDER BY s.id DESC
    `;

    const stockData = await executeQuery(query);

    // ✅ Handle empty result safely
    if (!stockData || stockData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: "No stock data found",
      });
    }

    // ✅ Success response
    return NextResponse.json({
      success: true,
      data: stockData,
      count: stockData.length,
    });
  } catch (error) {
    console.error("Error fetching stock data:", error.message, error.stack);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message || "Database query failed",
      },
      { status: 500 }
    );
  }
}