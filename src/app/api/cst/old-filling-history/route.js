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
    const limit = 10; // 10 records per page as requested
    const offset = (page - 1) * limit;
    
    console.log('📧 Request Email:', email);
    console.log('📄 Page:', page);
    console.log('🔍 Search:', search);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get customer info first
    const customerQuery = `SELECT id, name FROM customers WHERE email = ? LIMIT 1`;
    const customerResult = await executeQuery(customerQuery, [email]);
    
    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    const customerId = customerResult[0].id;
    console.log('✅ Customer found, ID:', customerId);
    
    // Check if old_filling_history table exists
    let tableExists = false;
    try {
      const checkTableQuery = `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'old_filling_history'
      `;
      const tableResult = await executeQuery(checkTableQuery);
      tableExists = tableResult[0].count > 0;
      console.log('📋 Table exists:', tableExists);
    } catch (error) {
      console.error('❌ Error checking table existence:', error);
    }
    
    if (!tableExists) {
      console.log('⚠️ old_filling_history table does not exist');
      return NextResponse.json({
        success: true,
        history: [],
        customerInfo: { 
          id: customerId, 
          name: customerResult[0].name,
          email: email 
        },
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          limit: limit,
          hasNextPage: false,
          hasPrevPage: false
        },
        message: 'Old filling history table not found. This feature may not be available yet.'
      });
    }
    
    // Build search conditions
    let whereClause = `WHERE ofh.cl_id = ?`;
    let queryParams = [customerId];
    
    if (search) {
      whereClause += ` AND (
        ofh.pname LIKE ? OR 
        ofh.amount LIKE ? OR 
        ofh.filling_date LIKE ?
      )`;
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam);
    }
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM old_filling_history ofh
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, queryParams);
    const totalCount = countResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    
    // Get paginated data - simplified query to avoid join issues
    const query = `
      SELECT 
        ofh.*
      FROM old_filling_history ofh
      ${whereClause}
      ORDER BY ofh.filling_date DESC 
      LIMIT ? OFFSET ?
    `;
    const result = await executeQuery(query, [...queryParams, limit, offset]);
    
    console.log('✅ Old filling history records:', result.length);
    console.log('📊 Total records:', totalCount);
    console.log('📄 Total pages:', totalPages);
    
    return NextResponse.json({
      success: true,
      history: result,
      customerInfo: { 
        id: customerId, 
        name: customerResult[0].name,
        email: email 
      },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalCount: totalCount,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Old Filling History API Error:', error);
    console.error('❌ Error Stack:', error.stack);
    
    // Log more details about the error
    if (error.message && error.message.includes('Table')) {
      console.error('❌ Table not found error - checking database schema');
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch old filling history: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
