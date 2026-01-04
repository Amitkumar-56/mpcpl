import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get cash balance
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

    const balance = result.length > 0 ? parseFloat(result[0].balance) : 0;

    // Get non-billing customer inward transactions (cash history)
    // Non-billing customers have billing_type = 2
    const cashHistoryQuery = `
      SELECT 
        fh.id,
        fh.cl_id as customer_id,
        c.name as customer_name,
        fh.amount,
        fh.credit_date as payment_date,
        COALESCE(fh.payment_type, 'Cash') as payment_type,
        COALESCE(fh.remarks, '') as remark,
        fh.credit_date,
        fh.created_at
      FROM filling_history fh
      INNER JOIN customers c ON fh.cl_id = c.id
      WHERE fh.trans_type = 'inward'
        AND c.billing_type = 2
        AND fh.cl_id IS NOT NULL
      ORDER BY fh.credit_date DESC, fh.id DESC
    `;

    const cashHistory = await executeQuery(cashHistoryQuery).catch(() => []);

    return NextResponse.json({ 
      success: true, 
      balance,
      records: cashHistory || [],
      totalCash: balance
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch balance', error: error.message },
      { status: 500 }
    );
  }
}
