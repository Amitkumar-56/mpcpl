// src/app/api/nb-stock/activity-log/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const startTime = Date.now();
    console.log('🚀 NB Stock Activity Log API called at:', new Date().toISOString());
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Extract filter parameters
    const search = searchParams.get('search') || '';
    const station = searchParams.get('station') || 'all';
    const product = searchParams.get('product') || 'all';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    
    console.log('📊 Filters:', { search, station, product, dateFrom, dateTo });
    
    // Build WHERE conditions
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(`(fs.station_name LIKE '%${search}%' OR p.pname LIKE '%${search}%')`);
    }
    
    if (station !== 'all' && station !== 'All Stations') {
      whereConditions.push(`fs.station_name = '${station}'`);
    }
    
    if (product !== 'all' && product !== 'All Products') {
      whereConditions.push(`p.pname = '${product}'`);
    }
    
    if (dateFrom) {
      whereConditions.push(`DATE(nbs.created_at) >= '${dateFrom}'`);
    }
    
    if (dateTo) {
      whereConditions.push(`DATE(nbs.created_at) <= '${dateTo}'`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    console.log('🔍 WHERE clause:', whereClause);
    
    // Simplified main query - get basic data first
    const queryStartTime = Date.now();
    const logs = await executeQuery(`
      SELECT 
        nbs.id,
        nbs.station_id,
        nbs.product_id,
        nbs.stock,
        nbs.created_at,
        nbs.updated_at
      FROM non_billing_stocks nbs
      LEFT JOIN filling_stations fs ON nbs.station_id = fs.id
      LEFT JOIN products p ON nbs.product_id = p.id
      ${whereClause}
      ORDER BY nbs.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `);
    
    console.log(`⏱️ Main query took: ${Date.now() - queryStartTime}ms for ${logs.length} records`);
    
    // Get total count
    const countStartTime = Date.now();
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM non_billing_stocks nbs
      LEFT JOIN filling_stations fs ON nbs.station_id = fs.id
      LEFT JOIN products p ON nbs.product_id = p.id
      ${whereClause}
    `);
    console.log(`⏱️ Count query took: ${Date.now() - countStartTime}ms`);
    
    // Transform data for activity logs
    const transformStartTime = Date.now();
    const activities = [];
    
    // Batch fetch all names at once instead of per-record queries
    const allStationIds = new Set();
    const allProductIds = new Set();
    
    logs.forEach(log => {
      if (log.station_id) allStationIds.add(log.station_id);
      if (log.product_id) allProductIds.add(log.product_id);
    });
    
    // Get all names in one batch
    const stationIdsArray = Array.from(allStationIds);
    const productIdsArray = Array.from(allProductIds);
    
    const nameMap = {};
    
    // Get station names
    if (stationIdsArray.length > 0) {
      const stations = await executeQuery(
        `SELECT id, station_name FROM filling_stations WHERE id IN (${stationIdsArray.join(',')})`
      );
      stations.forEach(station => {
        nameMap[`station_${station.id}`] = station.station_name;
      });
    }
    
    // Get product names
    if (productIdsArray.length > 0) {
      const products = await executeQuery(
        `SELECT id, pname FROM products WHERE id IN (${productIdsArray.join(',')})`
      );
      products.forEach(product => {
        nameMap[`product_${product.id}`] = product.pname;
      });
    }
    
    // Transform records using the name map
    logs.forEach(log => {
      const stationName = nameMap[`station_${log.station_id}`];
      const productName = nameMap[`product_${log.product_id}`];
      
      activities.push({
        id: log.id,
        stationId: log.station_id,
        productId: log.product_id,
        stock: log.stock,
        createdAt: log.created_at,
        updatedAt: log.updated_at,
        
        // Additional fields for display
        stationName: stationName || `Station ${log.station_id}`,
        productName: productName || `Product ${log.product_id}`
      });
    });
    
    console.log(`⏱️ Transform took: ${Date.now() - transformStartTime}ms`);
    console.log(`⏱️ Total API time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        total: countResult[0].total,
        limit: limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching NB stock activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs: ' + error.message },
      { status: 500 }
    );
  }
}
