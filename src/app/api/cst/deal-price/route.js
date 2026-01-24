import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const com_id = searchParams.get("com_id"); // Customer company ID
    const station_id = searchParams.get("station_id");
    const product_id = searchParams.get("product_id");
    const sub_product_id = searchParams.get("sub_product_id");

    console.log('🔍 Deal Price Search Parameters:', {
      com_id,
      station_id,
      product_id,
      sub_product_id
    });

    // Validate required parameters
    if (!com_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required parameter: com_id is required",
        },
        { status: 400 }
      );
    }

    // Parse IDs
    const parsedComId = parseInt(com_id);

    if (isNaN(parsedComId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid com_id parameter",
        },
        { status: 400 }
      );
    }

    // NEW: If only com_id is provided, return all deal prices for this customer
    if (!station_id && !product_id) {
      console.log('📋 Fetching all deal prices for customer:', parsedComId);
      
      // Optimized query with LIMIT to prevent slow loading
      const allPricesQuery = `
        SELECT 
          dp.com_id,
          dp.station_id,
          dp.product_id,
          dp.sub_product_id,
          dp.price,
          dp.is_active,
          COALESCE(s.station_name, 'Station ' + dp.station_id) as station_name,
          COALESCE(p.pname, 'Product ' + dp.product_id) as product_name,
          COALESCE(sp.sub_product_name, 'Sub-Product ' + dp.sub_product_id) as sub_product_name,
          COALESCE(sp.sub_product_code, 'CODE' + dp.sub_product_id) as sub_product_code
        FROM deal_prices dp
        LEFT JOIN filling_stations s ON dp.station_id = s.id
        LEFT JOIN products p ON dp.product_id = p.id
        LEFT JOIN sub_products sp ON dp.sub_product_id = sp.id
        WHERE dp.com_id = ? AND dp.is_active = 1
        ORDER BY s.station_name, p.pname, sp.sub_product_code
        LIMIT 500
      `;
      
      const allPrices = await executeQuery(allPricesQuery, [parsedComId]);
      
      console.log('✅ Found', allPrices.length, 'deal prices for customer', parsedComId);
      
      return NextResponse.json({
        success: true,
        priceData: allPrices,
        message: `Found ${allPrices.length} deal prices`
      });
    }

    // Original logic for specific price lookup
    const parsedStationId = parseInt(station_id);
    const parsedProductId = parseInt(product_id);
    const parsedSubProductId = sub_product_id ? parseInt(sub_product_id) : null;

    if (isNaN(parsedStationId) || isNaN(parsedProductId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid station_id or product_id parameters",
        },
        { status: 400 }
      );
    }

    let priceData = null;
    let priceType = '';

    // STRATEGY 1: First try to get exact match with sub_product_id
    if (parsedSubProductId && !isNaN(parsedSubProductId)) {
      const exactQuery = `
        SELECT 
          dp.id,
          dp.price,
          dp.com_id,
          dp.station_id,
          dp.product_id,
          dp.sub_product_id,
          dp.Schedule_Date,
          dp.Schedule_Time,
          dp.updated_date,
          p.pname AS product_name,
          fs.station_name,
          pc.pcode as sub_product_code,
          pc.name as sub_product_name
        FROM deal_price dp
        LEFT JOIN products p ON dp.product_id = p.id
        LEFT JOIN filling_stations fs ON dp.station_id = fs.id
        LEFT JOIN product_codes pc ON dp.sub_product_id = pc.id
        WHERE dp.com_id = ? 
          AND dp.station_id = ?
          AND dp.product_id = ?
          AND dp.sub_product_id = ?
          AND dp.is_active = 1
          AND dp.status = 'active'
          AND dp.is_applied = 1
        ORDER BY dp.updated_date DESC
        LIMIT 1
      `;

      const exactResult = await executeQuery({
        query: exactQuery,
        values: [parsedComId, parsedStationId, parsedProductId, parsedSubProductId]
      });

      if (exactResult && exactResult.length > 0) {
        priceData = exactResult[0];
        priceType = 'exact_sub_product';
        console.log('✅ Found exact sub-product price');
      }
    }

    // STRATEGY 2: If no exact sub-product match, try main product price (sub_product_id IS NULL or 0)
    if (!priceData) {
      const mainProductQuery = `
        SELECT 
          dp.id,
          dp.price,
          dp.com_id,
          dp.station_id,
          dp.product_id,
          dp.sub_product_id,
          dp.Schedule_Date,
          dp.Schedule_Time,
          dp.updated_date,
          p.pname AS product_name,
          fs.station_name,
          NULL as sub_product_code,
          NULL as sub_product_name
        FROM deal_price dp
        LEFT JOIN products p ON dp.product_id = p.id
        LEFT JOIN filling_stations fs ON dp.station_id = fs.id
        WHERE dp.com_id = ? 
          AND dp.station_id = ?
          AND dp.product_id = ?
          AND (dp.sub_product_id IS NULL OR dp.sub_product_id = 0 OR dp.sub_product_id = '')
          AND dp.is_active = 1
          AND dp.status = 'active'
          AND dp.is_applied = 1
        ORDER BY dp.updated_date DESC
        LIMIT 1
      `;

      const mainProductResult = await executeQuery({
        query: mainProductQuery,
        values: [parsedComId, parsedStationId, parsedProductId]
      });

      if (mainProductResult && mainProductResult.length > 0) {
        priceData = mainProductResult[0];
        priceType = 'main_product';
        console.log('✅ Found main product price');
        
        // If sub_product_id was requested but we're using main product price,
        // we can still fetch sub-product details
        if (parsedSubProductId && !isNaN(parsedSubProductId)) {
          const subProductQuery = `
            SELECT pcode, name 
            FROM product_codes 
            WHERE id = ? 
            LIMIT 1
          `;
          
          const subProductResult = await executeQuery({
            query: subProductQuery,
            values: [parsedSubProductId]
          });
          
          if (subProductResult && subProductResult.length > 0) {
            priceData.sub_product_code = subProductResult[0].pcode;
            priceData.sub_product_name = subProductResult[0].name;
          }
        }
      }
    }

    // STRATEGY 3: Check if there's any price for this customer at this station (any product)
    if (!priceData) {
      const anyProductQuery = `
        SELECT 
          dp.id,
          dp.price,
          dp.com_id,
          dp.station_id,
          dp.product_id,
          dp.sub_product_id,
          p.pname AS product_name,
          fs.station_name
        FROM deal_price dp
        LEFT JOIN products p ON dp.product_id = p.id
        LEFT JOIN filling_stations fs ON dp.station_id = fs.id
        WHERE dp.com_id = ? 
          AND dp.station_id = ?
          AND dp.is_active = 1
          AND dp.status = 'active'
          AND dp.is_applied = 1
        ORDER BY dp.updated_date DESC
        LIMIT 1
      `;

      const anyProductResult = await executeQuery({
        query: anyProductQuery,
        values: [parsedComId, parsedStationId]
      });

      if (anyProductResult && anyProductResult.length > 0) {
        priceData = anyProductResult[0];
        priceType = 'any_product';
        console.log('⚠️ Using any available product price as fallback');
      }
    }

    // If still no price found
    if (!priceData) {
      console.log('❌ No active price found for the given parameters');
      return NextResponse.json({
        success: false,
        data: null,
        message: 'No active price found for this customer, station, and product combination',
        price_type: 'not_found'
      }, { status: 404 });
    }

    console.log('💰 Final Price Data:', {
      price: priceData.price,
      product_name: priceData.product_name,
      sub_product: priceData.sub_product_name || 'Main Product',
      price_type: priceType
    });

    return NextResponse.json({
      success: true,
      data: priceData,
      price_type: priceType,
      message: `Price found (${priceType})`
    });

  } catch (error) {
    console.error("❌ Deal Price API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error: " + error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}