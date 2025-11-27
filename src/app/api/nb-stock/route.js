// src/app/api/nb-stock/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🚀 Starting NB Stock API...');

    // Step 1: Check table exists and get count
    const countQuery = `SELECT COUNT(*) as total FROM non_billing_stocks`;
    console.log('📊 Counting records...');
    const countResult = await executeQuery(countQuery);
    const totalRecords = countResult[0]?.total || 0;
    
    console.log(`📊 Total records found: ${totalRecords}`);

    if (totalRecords === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        message: "No records found in non_billing_stocks table",
        isEmpty: true
      });
    }

    // Step 2: Fetch data with simple query first
    console.log('🔄 Fetching stock data...');
    const simpleQuery = `
      SELECT 
        id,
        station_id,
        product_id,
        stock,
        created_at
      FROM non_billing_stocks 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    let results = await executeQuery(simpleQuery);
    console.log(`✅ Found ${results.length} raw records`);

    // Step 3: If we have data, enhance with station and product names
    if (results.length > 0) {
      // Get station names
      const stationIds = [...new Set(results.map(row => row.station_id))];
      const stationQuery = `SELECT id, station_name FROM filling_stations WHERE id IN (${stationIds.join(',')})`;
      const stations = await executeQuery(stationQuery);
      console.log(`🏪 Found ${stations.length} stations`);

      // Get product names  
      const productIds = [...new Set(results.map(row => row.product_id))];
      const productQuery = `SELECT id, pname FROM products WHERE id IN (${productIds.join(',')})`;
      const products = await executeQuery(productQuery);
      console.log(`🛢️ Found ${products.length} products`);

      // Combine data
      results = results.map(row => {
        const station = stations.find(s => s.id === row.station_id);
        const product = products.find(p => p.id === row.product_id);
        
        return {
          ...row,
          station_name: station ? station.station_name : `Station ${row.station_id}`,
          pname: product ? product.pname : `Product ${row.product_id}`
        };
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: results,
      count: results.length,
      isEmpty: false
    });

  } catch (error) {
    console.error("💥 Error in NB Stock API:", error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      data: []
    }, { status: 500 });
  }
}