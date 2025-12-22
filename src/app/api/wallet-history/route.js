// src/app/api/wallet-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cl_id = searchParams.get('id') || searchParams.get('cl_id');

    if (!cl_id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const customerId = parseInt(cl_id);
    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        id, 
        rid, 
        old_balance, 
        deducted, 
        added, 
        c_balance, 
        d_date 
      FROM wallet_history 
      WHERE cl_id = ? 
      ORDER BY id DESC
    `;

    const results = await executeQuery(query, [customerId]);

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error fetching wallet history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

