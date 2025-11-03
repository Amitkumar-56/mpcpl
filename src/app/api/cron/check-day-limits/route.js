// src/app/api/cron/check-day-limits/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    console.log('🔔 Running automatic day limit expiry check:', currentDate);

    // Find active day limit customers whose expiry has passed
    const expiredCustomersQuery = `
      SELECT 
        cb.com_id,
        c.name as customer_name,
        cb.day_limit_expiry,
        COUNT(fr.id) as unpaid_invoices_count
      FROM customer_balances cb
      LEFT JOIN customers c ON cb.com_id = c.id
      LEFT JOIN filling_requests fr ON cb.com_id = fr.cid 
        AND fr.status = 'Completed' 
        AND fr.payment_status = 0
      WHERE c.client_type = '3'
      AND cb.day_limit_expiry IS NOT NULL 
      AND cb.day_limit_expiry <= ?
      AND cb.is_active = 1
      GROUP BY cb.com_id
    `;
    
    const expiredCustomers = await executeQuery(expiredCustomersQuery, [currentDate]);
    
    let expiredCount = 0;
    let invoicesMarked = 0;
    
    for (const customer of expiredCustomers) {
      const customerId = customer.com_id;
      
      // Mark customer as inactive (stop further transactions)
      await executeQuery(
        `UPDATE customer_balances SET is_active = 0 WHERE com_id = ?`,
        [customerId]
      );
      
      // Mark all unpaid invoices as overdue
      const markOverdueResult = await executeQuery(
        `UPDATE filling_requests 
         SET payment_status = 2 -- 2 = Overdue
         WHERE cid = ? 
         AND status = 'Completed' 
         AND payment_status = 0`,
        [customerId]
      );
      
      expiredCount++;
      invoicesMarked += markOverdueResult.affectedRows || 0;
      
      console.log(`❌ Day Limit Expired: ${customer.customer_name} (ID: ${customerId}) - ${markOverdueResult.affectedRows} invoices marked overdue`);
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Automatic day limit check completed. ${expiredCount} customers expired, ${invoicesMarked} invoices marked overdue.`,
      expired_count: expiredCount,
      invoices_marked: invoicesMarked
    });
    
  } catch (error) {
    console.error('Error in day limit expiry check:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check day limits' 
    }, { status: 500 });
  }
}