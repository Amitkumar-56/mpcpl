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
      
      // SIMPLE TEST QUERY FIRST - This should always work
      console.log('🧪 Testing simple query first...');
      const simpleTestQuery = `
        SELECT COUNT(*) as count
        FROM old_filling_history 
        WHERE cl_id = ?
      `;
      
      try {
        const testResult = await executeQuery(simpleTestQuery, [customerInfo?.id]);
        console.log('✅ Simple test query result:', testResult);
      } catch (testError) {
        console.error('❌ Even simple test failed:', testError.message);
        throw testError;
      }
      
      
     
      
      // If simple test passed, continue with full query
      console.log('🔄 Simple test passed, trying full query...');
      
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
          ofh.trans_type LIKE ? OR
          fs.station_name LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      oldHistoryQuery += ` ORDER BY ofh.filling_date DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
      
      console.log('📋 Final Query:', oldHistoryQuery);
      console.log('📋 Query Params:', queryParams);
      
      try {
        oldHistory = await executeQuery(oldHistoryQuery, queryParams);
        console.log('✅ Old filling history records:', oldHistory.length);
      } catch (queryError) {
        console.error('❌ Query failed on server:', queryError.message);
        console.error('❌ SQL State:', queryError.sqlState);
        console.error('❌ SQL Error:', queryError.sqlMessage);
        
        // EMERGENCY FALLBACK - Use only basic columns that should always work
        console.log('🔄 Emergency fallback - basic columns only...');
        const emergencyQuery = `
          SELECT 
            ofh.id,
            ofh.cl_id,
            ofh.filling_date,
            ofh.product_id,
            ofh.amount
          FROM old_filling_history ofh
          WHERE ofh.cl_id = ?
          ORDER BY ofh.filling_date DESC LIMIT ? OFFSET ?
        `;
        
        try {
          const basicResult = await executeQuery(emergencyQuery, [customerInfo?.id, limit, offset]);
          console.log('✅ Emergency fallback worked:', basicResult.length);
          
          // Add all expected columns with default values so frontend doesn't break
          oldHistory = basicResult.map(record => ({
            id: record.id,
            cl_id: record.cl_id,
            completed_date: record.filling_date,
            filling_date: record.filling_date,
            product_id: record.product_id,
            pname: 'Unknown Products',
            rid: null,
            fs_id: null,
            station_name: 'Unknown Station',
            trans_type: null,
            current_stock: null,
            filling_qty: null,
            amount: record.amount,
            credit: null,
            in_amount: null,
            d_amount: null,
            limit_type: null,
            credit_date: null,
            available_stock: null,
            old_amount: null,
            new_amount: null,
            remaining_limit: null,
            created_by: null,
            created_at: null,
            updated_at: null,
            default_type: 'filling'
          }));
        } catch (emergencyError) {
          console.error('❌ Even emergency query failed:', emergencyError.message);
          throw emergencyError;
        }
      }
      
      if (oldHistory.length > 0) {
        console.log('📊 Sample Record:', oldHistory[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching old filling history:', error);
    }

   
    const totalPages = Math.ceil(oldHistory.length / limit);

    console.log('📊 Final Results:');
    console.log('- Customer Info:', customerInfo);
    console.log('- Total Records:', oldHistory.length);
    console.log('- Old Filling History:', oldHistory.length);
    console.log('- Total Pages:', totalPages);

    return NextResponse.json({
      success: true,
      customerInfo: customerInfo,
      history: oldHistory,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: oldHistory.length,
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
