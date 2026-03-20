// Old Filling History API - CST Dashboard Integration
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    console.log('🚀 Old Filling History API Called');
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    console.log('📧 Request Email:', email);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get customer info first
    const customerQuery = `SELECT id FROM customers WHERE email = ? LIMIT 1`;
    const customerResult = await executeQuery(customerQuery, [email]);
    
    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    const customerId = customerResult[0].id;
    console.log('✅ Customer found, ID:', customerId);
    
    // Simple query to get old filling history with vehicle number
    const query = `
      SELECT 
        ofh.*,
        ofr.vehicle_number
      FROM old_filling_history ofh
      LEFT JOIN old_filling_requests ofr ON ofh.rid = ofr.rid
      WHERE ofh.cl_id = ? 
      ORDER BY ofh.filling_date DESC 
      LIMIT 50
    `;
    const result = await executeQuery(query, [customerId]);
    
    console.log('✅ Old filling history records:', result.length);
    
    return NextResponse.json({
      success: true,
      history: result,
      customerInfo: { id: customerId, email: email },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: result.length,
        limit: 50
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
