import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET: Fetch only total cash balance
export async function GET() {
  try {
    console.log('📊 Fetching total cash balance...');
    
    const cashBalance = await executeQuery(
      'SELECT COALESCE(balance, 0) as balance FROM cash_balance LIMIT 1'
    );

    const totalCash = cashBalance[0]?.balance || 0;
    
    console.log('✅ Total cash fetched:', totalCash);

    return NextResponse.json({
      success: true,
      data: {
        totalCash
      }
    });

  } catch (error) {
    console.error('❌ Error fetching total cash:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch total cash',
        message: error.message 
      },
      { status: 500 }
    );
  }
}