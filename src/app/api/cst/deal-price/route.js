import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get("customer_id");
    const station_id = searchParams.get("station_id");
    const product_id = searchParams.get("product_id");
    const sub_product_id = searchParams.get("sub_product_id");

    console.log('🔍 Deal Price Search Params:', {
      customer_id,
      station_id,
      product_id,
      sub_product_id
    });

    if (!customer_id || !station_id || !product_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const priceQuery = `
      SELECT 
        dp.price,
        p.pname AS product_name,
        fs.station_name
      FROM deal_price dp
      LEFT JOIN products p ON dp.product_id = p.id
      LEFT JOIN filling_stations fs ON dp.station_id = fs.id
      WHERE dp.com_id = ? 
        AND dp.station_id = ?
        AND dp.product_id = ?
        AND dp.is_active = 1
        AND dp.status = 'active'
      ORDER BY dp.updated_date DESC
      LIMIT 1
    `;

    const prices = await executeQuery(priceQuery, [
      customer_id,
      station_id,
      product_id,
    ]);

    console.log('💰 Deal Price Results:', {
      found: prices.length > 0,
      price: prices[0]?.price || 0,
      product_name: prices[0]?.product_name
    });

    return NextResponse.json({
      success: true,
      data: prices[0] || null,
      count: prices.length,
    });
  } catch (error) {
    console.error("❌ Deal Price API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error: " + error.message,
      },
      { status: 500 }
    );
  }
}