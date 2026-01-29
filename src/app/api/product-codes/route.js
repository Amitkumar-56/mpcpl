import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rows = await executeQuery(`
      SELECT 
        pc.id,
        pc.pcode,
        p.pname
      FROM product_codes pc
      LEFT JOIN products p ON pc.product_id = p.id
      ORDER BY p.pname, pc.pcode
    `);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching product codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product codes' },
      { status: 500 }
    );
  }
}
