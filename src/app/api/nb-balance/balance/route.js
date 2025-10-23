// src/app/api/nb-balance/balance/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching balance...');
    const balanceResult = await executeQuery(
      'SELECT balance FROM cash_balance ORDER BY id DESC LIMIT 1'
    );
    
    console.log('Balance query result:', balanceResult);
    
    if (balanceResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Balance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      balance: parseFloat(balanceResult[0].balance)
    });

  } catch (error) {
    console.error("Error fetching balance:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Error fetching balance",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Check server logs'
      },
      { status: 500 }
    );
  }
}