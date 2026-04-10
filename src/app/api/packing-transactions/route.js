// src/app/api/packing-transactions/route.js
import pool from '@/lib/db';
import { NextResponse } from 'next/server';

// GET packing transactions by packing_id
export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const packing_id = searchParams.get('vendor_id');
    
    if (!packing_id) {
      return NextResponse.json(
        { success: false, error: 'Packing ID is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    // Get packing name
    const [packingResult] = await connection.execute(
      'SELECT name FROM vendors WHERE id = ?',
      [packing_id]
    );
    
    const packing_name = packingResult.length > 0 ? packingResult[0].name : '';
    
    // Get packing transactions
    const [rows] = await connection.execute(`
      SELECT id, vendor_id, customer_name, reverse_name, amount, transaction_date, created_at, updated_at, created_by
      FROM vendor_transactions
      WHERE vendor_id = ?
      ORDER BY transaction_date DESC
    `, [packing_id]);
    
    return NextResponse.json({
      success: true,
      transactions: rows,
      vendor_name: packing_name
    });
  } catch (error) {
    console.error('Error fetching packing transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Error fetching packing transactions' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
