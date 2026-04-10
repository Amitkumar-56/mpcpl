import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const vendor_id = searchParams.get('vendor_id');

    if (!vendor_id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    // Get vendor name first
    const vendorQuery = 'SELECT name FROM vendors WHERE id = ?';
    const [vendorResult] = await connection.execute(vendorQuery, [vendor_id]);
    
    if (vendorResult.length === 0) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const vendor_name = vendorResult[0].name;

    // Get cash collection records with customer names - optimized query with indexes
    const collectionsQuery = `
      SELECT 
        cc.id, 
        cc.customer_id, 
        COALESCE(c.name, 'Unknown') as customer_name,
        cc.amount, 
        cc.collection_date, 
        cc.notes, 
        cc.created_at, 
        cc.updated_at, 
        cc.created_by
      FROM cash_collection cc
      LEFT JOIN customers c ON cc.customer_id = c.id
      WHERE cc.vendor_id = ? 
      ORDER BY cc.collection_date DESC, cc.id DESC
      LIMIT 1000
    `;
    
    const [collectionsResult] = await connection.execute(collectionsQuery, [vendor_id]);

    return NextResponse.json({
      success: true,
      vendor_name,
      collections: collectionsResult
    });

  } catch (error) {
    console.error('Error fetching cash collections:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
