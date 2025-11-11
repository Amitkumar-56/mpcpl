import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Fetch expenses records
    const expensesQuery = `
      SELECT * FROM expenses 
      ORDER BY id DESC
    `;
    
    // Fetch cash balance
    const balanceQuery = `
      SELECT balance FROM cash_balance 
      LIMIT 1
    `;

    const [expenses, balanceResult] = await Promise.all([
      executeQuery(expensesQuery),
      executeQuery(balanceQuery)
    ]);

    const totalCash = balanceResult[0]?.balance || 0;

    return NextResponse.json({
      success: true,
      data: {
        expenses: expenses || [],
        totalCash: totalCash
      }
    });

  } catch (error) {
    console.error('Error fetching cash data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch cash data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}