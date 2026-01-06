import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const dateFilter = searchParams.get('date') || '';
    const paymentTypeFilter = searchParams.get('paymentType') || '';
    
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
    // Check if remarks column exists
    let hasRemarksColumn = false;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
      const colSet = new Set(colsInfo.map(r => r.Field));
      hasRemarksColumn = colSet.has('remarks');
    } catch (colError) {
      console.warn('Could not check remarks column:', colError.message);
    }
    
    const remarksField = hasRemarksColumn ? 'COALESCE(fh.remarks, "") as remark' : '"" as remark';
    
    // Build WHERE conditions
    let whereConditions = [
      "fh.trans_type = 'inward'",
      "c.billing_type = 2",
      "fh.cl_id IS NOT NULL",
      "fh.amount > 0"
    ];
    const queryParams = [];
    
    // Search filter (customer name or remark)
    if (search) {
      if (hasRemarksColumn) {
        whereConditions.push("(c.name LIKE ? OR fh.remarks LIKE ?)");
        queryParams.push(`%${search}%`, `%${search}%`);
      } else {
        whereConditions.push("c.name LIKE ?");
        queryParams.push(`%${search}%`);
      }
    }
    
    // Date filter
    if (dateFilter) {
      whereConditions.push("DATE(fh.credit_date) = ?");
      queryParams.push(dateFilter);
    }
    
    // Payment type filter (always 'Cash' for now, but keeping for future)
    if (paymentTypeFilter && paymentTypeFilter !== 'All Types') {
      // Since payment_type is always 'Cash', filter only if 'Cash' is selected
      // This is for future compatibility if payment_type column is added
    }
    
    const cashHistoryQuery = `
      SELECT 
        fh.id,
        fh.cl_id as customer_id,
        c.name as customer_name,
        fh.amount,
        fh.credit_date as payment_date,
        'Cash' as payment_type,
        ${remarksField},
        fh.credit_date,
        fh.created_at
      FROM filling_history fh
      INNER JOIN customers c ON fh.cl_id = c.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY fh.credit_date DESC, fh.id DESC
    `;

    const cashHistory = await executeQuery(cashHistoryQuery, queryParams).catch((err) => {
      console.error('Error fetching cash history:', err);
      return [];
    });

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
