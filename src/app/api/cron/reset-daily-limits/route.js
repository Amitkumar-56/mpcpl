// src/app/api/cron/reset-daily-limits/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const customersQuery = `
      SELECT com_id, day_limit, day_limit_expiry
      FROM customer_balances 
      WHERE day_limit > 0 
      AND (day_limit_expiry IS NULL OR day_limit_expiry >= CURDATE())
    `;
    const customers = await executeQuery(customersQuery);
    
    let resetCount = 0;
    
    for (const customer of customers) {
      const customerId = customer.com_id;
      const dayLimit = parseFloat(customer.day_limit) || 0;
      
      await executeQuery(
        `UPDATE customer_balances 
         SET remaining_day_limit = ?, updated_at = NOW()
         WHERE com_id = ?`,
        [dayLimit, customerId]
      );
      
      resetCount++;
    }
    
    return NextResponse.json({ 
      message: `Daily limits reset successfully for ${resetCount} customers`,
      resetCount 
    });
    
  } catch (error) {
    console.error('Error resetting daily limits:', error);
    return NextResponse.json({ 
      error: 'Failed to reset daily limits',
      details: error.message 
    }, { status: 500 });
  }
}