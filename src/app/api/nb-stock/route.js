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

    // Step 2: Fetch data with logs - GROUP BY to get aggregated stock
    console.log('🔄 Fetching stock data with logs...');
    // Use IFNULL for updated_at in case column doesn't exist - fallback to created_at
    const query = `
      SELECT 
        n.station_id,
        n.product_id,
        SUM(n.stock) as stock,
        MAX(n.created_at) as created_at,
        IFNULL(MAX(n.updated_at), MAX(n.created_at)) as updated_at,
        MAX(n.created_by) as created_by,
        IFNULL(MAX(n.updated_by), MAX(n.created_by)) as updated_by,
        ep_created.name as created_by_name,
        IFNULL(ep_updated.name, ep_created.name) as updated_by_name
      FROM non_billing_stocks n
      LEFT JOIN employee_profile ep_created ON n.created_by = ep_created.id
      LEFT JOIN employee_profile ep_updated ON n.updated_by = ep_updated.id
      GROUP BY n.station_id, n.product_id, ep_created.name, ep_updated.name
      ORDER BY IFNULL(MAX(n.updated_at), MAX(n.created_at)) DESC
    `;
    
    let results = await executeQuery(query);
    console.log(`✅ Found ${results.length} aggregated records`);

    // Step 3: If we have data, enhance with station and product names
    if (results.length > 0) {
      // Get station names
      const stationIds = [...new Set(results.map(row => row.station_id))];
      const stationPlaceholders = stationIds.map(() => '?').join(',');
      const stationQuery = `SELECT id, station_name FROM filling_stations WHERE id IN (${stationPlaceholders})`;
      const stations = await executeQuery(stationQuery, stationIds);
      console.log(`🏪 Found ${stations.length} stations`);

      // Get product names  
      const productIds = [...new Set(results.map(row => row.product_id))];
      const productPlaceholders = productIds.map(() => '?').join(',');
      const productQuery = `SELECT id, pname FROM products WHERE id IN (${productPlaceholders})`;
      const products = await executeQuery(productQuery, productIds);
      console.log(`🛢️ Found ${products.length} products`);

      // Combine data
      results = results.map(row => {
        const station = stations.find(s => s.id === row.station_id);
        const product = products.find(p => p.id === row.product_id);
        
        return {
          ...row,
          station_name: station ? station.station_name : `Station ${row.station_id}`,
          pname: product ? product.pname : `Product ${row.product_id}`,
          stock: parseFloat(row.stock) || 0
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