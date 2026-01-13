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
        fs.station_name,
        pc.pcode as sub_product_code
      FROM deal_price dp
      LEFT JOIN products p ON dp.product_id = p.id
      LEFT JOIN filling_stations fs ON dp.station_id = fs.id
      LEFT JOIN product_codes pc ON dp.sub_product_id = pc.id
      WHERE dp.com_id = ? 
        AND dp.station_id = ?
        AND dp.product_id = ?
        ${sub_product_id ? 'AND dp.sub_product_id = ?' : ''}
        AND dp.is_active = 1
        AND dp.status = 'active'
      ORDER BY dp.updated_date DESC
      LIMIT 1
    `;

    const queryParams = [
      customer_id,
      station_id,
      product_id,
    ];
    
    if (sub_product_id) {
      queryParams.push(sub_product_id);
    }

    const prices = await executeQuery(priceQuery, queryParams);

    console.log('💰 Deal Price Results:', {
      found: prices.length > 0,
      price: prices[0]?.price || 0,
      product_name: prices[0]?.product_name,
      sub_product_code: prices[0]?.sub_product_code
    });

    // If no price found for sub-product, try to get price for main product
    if (prices.length === 0 && sub_product_id) {
      console.log('🔄 No sub-product price found, trying main product price...');
      
      const fallbackQuery = `
        SELECT 
          dp.price,
          p.pname AS product_name,
          fs.station_name,
          'Main Product' as sub_product_code
        FROM deal_price dp
        LEFT JOIN products p ON dp.product_id = p.id
        LEFT JOIN filling_stations fs ON dp.station_id = fs.id
        WHERE dp.com_id = ? 
          AND dp.station_id = ?
          AND dp.product_id = ?
          AND dp.is_active = 1
          AND dp.status = 'active'
          AND (dp.sub_product_id IS NULL OR dp.sub_product_id = '')
        ORDER BY dp.updated_date DESC
        LIMIT 1
      `;

      const fallbackPrices = await executeQuery(fallbackQuery, [
        customer_id,
        station_id,
        product_id
      ]);

      if (fallbackPrices.length > 0) {
        console.log('✅ Using main product price as fallback');
        return NextResponse.json({
          success: true,
          data: fallbackPrices[0] || null,
          message: 'Using main product price (sub-product price not found)'
        });
      }
    }

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