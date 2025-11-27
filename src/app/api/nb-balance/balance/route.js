import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let result = await executeQuery(
      'SELECT balance FROM cash_balance ORDER BY id DESC LIMIT 1'
    );

    // If no cash balance record exists, initialize it with 0
    if (result.length === 0) {
      await executeQuery(
        'INSERT INTO cash_balance (balance, updated_at) VALUES (0, NOW())'
      );
      // Fetch the newly created record
      result = await executeQuery(
        'SELECT balance FROM cash_balance ORDER BY id DESC LIMIT 1'
      );
    }

    return NextResponse.json({
      success: true,
      balance: parseFloat(result[0].balance),
      message: 'Balance fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database error occurred', 
        balance: 0,
        error: error.message 
      },
      { status: 500 }
    );
  }
}