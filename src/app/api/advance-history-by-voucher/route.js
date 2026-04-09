// src/app/api/advance-history-by-voucher/route.js
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
  let connection = null;
  try {
    console.log('=== Advance History by Voucher API Called ===');

    const { searchParams } = new URL(request.url);
    const voucher_id = searchParams.get('voucher_id');

    if (!voucher_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'voucher_id parameter is required',
          advance_history: []
        },
        { status: 400 }
      );
    }

    console.log('Fetching advance history for voucher_id:', voucher_id);

    // Get a single connection for all queries
    connection = await executeQuery('SELECT 1');

    // Query to fetch advance history with given_by employee details
    const sql = `
      SELECT 
        ah.id,
        ah.voucher_id,
        ah.amount,
        ah.given_date,
        ah.given_by,
        ah.created_at,
        e.name AS given_by_name,
        e.phone AS given_by_phone
      FROM advance_history ah
      LEFT JOIN employee_profile e ON ah.given_by = e.id
      WHERE ah.voucher_id = ?
      ORDER BY ah.given_date ASC
    `;

    console.log('SQL Query:', sql);
    console.log('Parameter:', [voucher_id]);

    // Execute query
    const result = await executeQuery(sql, [voucher_id]);
    console.log('Query result:', result.length, 'advance records found');

    return NextResponse.json({
      success: true,
      voucher_id: parseInt(voucher_id),
      advance_history: result,
      total_records: result.length
    });

  } catch (error) {
    console.error('Error in advance-history-by-voucher API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error: ' + error.message,
        advance_history: []
      },
      { status: 500 }
    );
  } finally {
    // Connection is automatically released by executeQuery
    if (connection) {
      // No manual release needed as executeQuery handles it
    }
  }
}
