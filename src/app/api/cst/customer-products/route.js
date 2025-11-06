import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing customer ID' 
      }, { status: 400 });
    }

    console.log('🛍️ Fetching products for customer:', customerId);

    const productsQuery = `
      SELECT 
        pc.id, 
        pc.pcode, 
        pc.product_id,
        p.pname as product_name
      FROM product_codes pc
      LEFT JOIN products p ON pc.product_id = p.id
      ORDER BY pc.pcode
    `;
    
    const productsData = await executeQuery(productsQuery);
    console.log('📊 Products data:', productsData);

    return NextResponse.json({ 
      success: true, 
      products: productsData || [],
      count: productsData.length
    });

  } catch (error) {
    console.error("❌ Products API Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}