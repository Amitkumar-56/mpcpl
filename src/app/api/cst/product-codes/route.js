import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Product ID is required' 
      }, { status: 400 });
    }

    // Filter sub-products based on product type
    let codesQuery = `
      SELECT 
        pc.id, 
        pc.pcode, 
        pc.product_id,
        p.pname as product_name
      FROM product_codes pc
      LEFT JOIN products p ON pc.product_id = p.id
      WHERE pc.product_id = ?
    `;

    // Parameters
    const queryParams = [productId];
    
    codesQuery += ` ORDER BY pc.pcode`;
    
    const codes = await executeQuery(codesQuery, queryParams);

    return NextResponse.json({ 
      success: true, 
      codes: codes || [],
      product_id: productId
    });

  } catch (error) {
    console.error("❌ Product Codes API Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}

