// app/api/customers/products/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    const sql = `
      SELECT DISTINCT 
        p.id,
        p.pname as name
      FROM products p
      INNER JOIN product_codes pc ON p.id = pc.product_id
      INNER JOIN deal_price dp ON pc.id = dp.sub_product_id
      WHERE dp.com_id = ?
      ORDER BY p.pname
    `;

    const values = customerId ? [customerId] : [];
    const data = await executeQuery({ query: sql, values });

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching products' },
      { status: 500 }
    );
  }
}