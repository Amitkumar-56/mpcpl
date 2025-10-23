import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await executeQuery(
      'SELECT balance FROM cash_balance ORDER BY id DESC LIMIT 1'
    );

    const balance = result.length > 0 ? parseFloat(result[0].balance) : 0;

    return NextResponse.json({ success: true, balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch balance', error: error.message },
      { status: 500 }
    );
  }
}
