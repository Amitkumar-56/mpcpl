// Old Filling History API - CST Dashboard Integration
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    console.log('🚀 Old Filling History API Called');
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const page = parseInt(searchParams.get('page')) || 1;
    const search = searchParams.get('search') || '';
    
    console.log('📧 Request Email:', email);
    console.log('📄 Page:', page);
    console.log('🔍 Search:', search);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const limit = 50;
    const offset = (page - 1) * limit;

    // Step 1: Get customer info from customers table (using current system)
    let customerInfo = null;
    try {
      console.log('🔍 Fetching customer from customers table...');
      const customerQuery = `
        SELECT id, name, email, phone 
        FROM customers 
        WHERE email = ?
        LIMIT 1
      `;
      const customerResult = await executeQuery(customerQuery, [email]);
      
      if (customerResult.length > 0) {
        customerInfo = customerResult[0];
        console.log('✅ Customer found:', customerInfo);
      }
    } catch (error) {
      console.error('❌ Error fetching customer:', error);
    }

    // Step 2: Fetch filling history from old_filling_history table using customer ID as cl_id
    let oldHistory = [];
    try {
      console.log('🔍 Fetching filling history from old_filling_history table...');
      console.log('🆔 Customer ID for cl_id:', customerInfo?.id);
      
      // First, let's check if there are any records for this customer
      const countCheckQuery = `SELECT COUNT(*) as count FROM old_filling_history WHERE cl_id = ?`;
      const countResult = await executeQuery(countCheckQuery, [customerInfo?.id]);
      console.log('📊 Count check result:', countResult);
      
      if (countResult[0].count === 0) {
        console.log('⚠️ No records found for cl_id:', customerInfo?.id);
        
        // Let's check what cl_ids exist in the table
        const clIdCheckQuery = `SELECT DISTINCT cl_id, COUNT(*) as count FROM old_filling_history GROUP BY cl_id ORDER BY count DESC LIMIT 10`;
        const clIdResult = await executeQuery(clIdCheckQuery);
        console.log('📋 Available cl_ids in old_filling_history:', clIdResult);
        
        // Let's also check a sample of records to see structure
        const sampleQuery = `SELECT * FROM old_filling_history LIMIT 5`;
        const sampleResult = await executeQuery(sampleQuery);
        console.log('📋 Sample records from old_filling_history:', sampleResult);
        
        // Debug: Check products table structure and data
        const productsCheckQuery = `SELECT id, pname FROM products LIMIT 10`;
        const productsResult = await executeQuery(productsCheckQuery);
        console.log('📋 Products table sample:', productsResult);
        
        // Debug: Check if product_id 6 exists in products table
        const specificProductCheckQuery = `SELECT id, pname FROM products WHERE id = 6`;
        const specificProductResult = await executeQuery(specificProductCheckQuery);
        console.log('📋 Product ID 6 check:', specificProductResult);
        
        // Debug: Check JOIN result for specific product_id
        const joinTestQuery = `
          SELECT 
            ofh.product_id,
            p.id as product_table_id,
            p.pname
          FROM old_filling_history ofh
          LEFT JOIN products p ON ofh.product_id = p.id
          WHERE ofh.cl_id = ? AND ofh.product_id = 6
          LIMIT 5
        `;
        const joinTestResult = await executeQuery(joinTestQuery, [customerInfo?.id]);
        console.log('📋 JOIN test for product_id 6:', joinTestResult);
        
        // Debug: Check old_filling_history product_ids
        const productIdsCheckQuery = `SELECT DISTINCT product_id FROM old_filling_history WHERE cl_id = ? LIMIT 10`;
        const productIdsResult = await executeQuery(productIdsCheckQuery, [customerInfo?.id]);
        console.log('📋 Product IDs in old_filling_history:', productIdsResult);
      }
      
      // Use proper JOINs with products and filling_stations tables
      let oldHistoryQuery = `
        SELECT 
          ofh.id,
          ofh.cl_id,
          DATE(ofh.filling_date) as completed_date,
          ofh.filling_date,
          ofh.product_id,
          COALESCE(p.pname, 'Unknown Products') as pname,
          ofh.rid,
          ofh.fs_id,
          COALESCE(fs.station_name, 'Unknown Station') as station_name,
          ofh.trans_type,
          ofh.current_stock,
          ofh.filling_qty,
          ofh.amount,
          ofh.credit,
          ofh.in_amount,
          ofh.d_amount,
          ofh.limit_type,
          ofh.credit_date,
          ofh.available_stock,
          ofh.old_amount,
          ofh.new_amount,
          ofh.remaining_limit,
          ofh.created_by,
          ofh.created_at,
          ofh.updated_at,
          'filling' as default_type
        FROM old_filling_history ofh
        LEFT JOIN products p ON ofh.product_id = p.id
        LEFT JOIN filling_stations fs ON ofh.fs_id = fs.id
        WHERE ofh.cl_id = ?
      `;
      
      let queryParams = [customerInfo?.id];
      
      // Add search filter if provided
      if (search) {
        oldHistoryQuery += ` AND (
          p.pname LIKE ? OR 
          ofh.amount LIKE ? OR 
          DATE(ofh.filling_date) LIKE ? OR
          ofh.vehicle_number LIKE ? OR
          ofh.trans_type LIKE ? OR
          fs.station_name LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      oldHistoryQuery += ` ORDER BY ofh.filling_date DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
      
      console.log('📋 Final Query:', oldHistoryQuery);
      console.log('📋 Query Params:', queryParams);
      
      oldHistory = await executeQuery(oldHistoryQuery, queryParams);
      console.log('✅ Old filling history records:', oldHistory.length);
      
      if (oldHistory.length > 0) {
        console.log('📊 Sample Record:', oldHistory[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching old filling history:', error);
    }

    // Step 3: Get total count for pagination
    let totalCount = 0;
    try {
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM old_filling_history ofh
        LEFT JOIN products p ON ofh.product_id = p.id
        LEFT JOIN filling_stations fs ON ofh.fs_id = fs.id
        WHERE ofh.cl_id = ?
      `;
      
      let countParams = [customerInfo?.id];
      
      if (search) {
        countQuery += ` AND (
          p.pname LIKE ? OR 
          ofh.amount LIKE ? OR 
          DATE(ofh.filling_date) LIKE ? OR
          ofh.trans_type LIKE ? OR
          fs.station_name LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      const countResult = await executeQuery(countQuery, countParams);
      totalCount = countResult[0]?.total || 0;
    } catch (error) {
      console.error('❌ Error counting records:', error);
      totalCount = oldHistory.length;
    }

    const totalPages = Math.ceil(totalCount / limit);

    console.log('📊 Final Results:');
    console.log('- Customer Info:', customerInfo);
    console.log('- Total Records:', totalCount);
    console.log('- Old Filling History:', oldHistory.length);
    console.log('- Total Pages:', totalPages);

    return NextResponse.json({
      success: true,
      customerInfo: customerInfo,
      history: oldHistory,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limit
      },
      stats: {
        totalRecords: oldHistory.length,
        database: 'old_filling_history',
        customerUsedAsClId: true
      }
    });

  } catch (error) {
    console.error('❌ Old Filling History API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch old filling history: ' + error.message 
      },
      { status: 500 }
    );
  }
}
