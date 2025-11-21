// src/app/api/cron/check-day-limits/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get current date at 12 AM (midnight)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const currentDateStr = currentDate.toISOString().slice(0, 10);
    
    console.log('🔔 Running automatic day limit expiry check at 12 AM:', currentDateStr);

    // Find active day limit customers where oldest unpaid completed_date + day_limit <= current_date
    // This means: current_date - oldest_unpaid_date >= day_limit
    const expiredCustomersQuery = `
      SELECT 
        cb.com_id,
        c.name as customer_name,
        cb.day_limit,
        MIN(fr.completed_date) as oldest_unpaid_date,
        COUNT(fr.id) as unpaid_invoices_count
      FROM customer_balances cb
      INNER JOIN customers c ON cb.com_id = c.id
      LEFT JOIN filling_requests fr ON cb.com_id = fr.cid 
        AND fr.status = 'Completed' 
        AND fr.payment_status = 0
      WHERE c.client_type = '3'
      AND cb.day_limit > 0
      AND cb.is_active = 1
      GROUP BY cb.com_id, c.name, cb.day_limit
      HAVING oldest_unpaid_date IS NOT NULL
        AND DATEDIFF(?, oldest_unpaid_date) >= cb.day_limit
    `;
    
    const expiredCustomers = await executeQuery(expiredCustomersQuery, [currentDateStr]);
    
    let expiredCount = 0;
    let invoicesMarked = 0;
    
    for (const customer of expiredCustomers) {
      const customerId = customer.com_id;
      const dayLimit = customer.day_limit;
      const oldestUnpaidDate = customer.oldest_unpaid_date;
      const daysElapsed = Math.floor((currentDate.getTime() - new Date(oldestUnpaidDate).getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`📅 Checking customer ${customer.customer_name}: day_limit=${dayLimit}, oldest_unpaid=${oldestUnpaidDate}, days_elapsed=${daysElapsed}`);
      
      // Mark customer as inactive (stop further transactions)
      await executeQuery(
        `UPDATE customer_balances SET is_active = 0 WHERE com_id = ?`,
        [customerId]
      );
      
      expiredCount++;
      
      console.log(`❌ Day Limit Exceeded: ${customer.customer_name} (ID: ${customerId}) - ${daysElapsed} days elapsed (limit: ${dayLimit} days). Customer deactivated.`);
    }
    
    // Also check for customers who should be reactivated (no longer overdue)
    const reactivateCustomersQuery = `
      SELECT 
        cb.com_id,
        c.name as customer_name,
        cb.day_limit,
        MIN(fr.completed_date) as oldest_unpaid_date
      FROM customer_balances cb
      INNER JOIN customers c ON cb.com_id = c.id
      LEFT JOIN filling_requests fr ON cb.com_id = fr.cid 
        AND fr.status = 'Completed' 
        AND fr.payment_status = 0
      WHERE c.client_type = '3'
      AND cb.day_limit > 0
      AND cb.is_active = 0
      GROUP BY cb.com_id, c.name, cb.day_limit
      HAVING oldest_unpaid_date IS NULL
         OR DATEDIFF(?, oldest_unpaid_date) < cb.day_limit
    `;
    
    const reactivateCustomers = await executeQuery(reactivateCustomersQuery, [currentDateStr]);
    let reactivatedCount = 0;
    
    for (const customer of reactivateCustomers) {
      const customerId = customer.com_id;
      
      // Reactivate customer
      await executeQuery(
        `UPDATE customer_balances SET is_active = 1 WHERE com_id = ?`,
        [customerId]
      );
      
      reactivatedCount++;
      console.log(`✅ Customer Reactivated: ${customer.customer_name} (ID: ${customerId}) - No longer overdue.`);
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Automatic day limit check completed at 12 AM. ${expiredCount} customers expired, ${reactivatedCount} customers reactivated.`,
      expired_count: expiredCount,
      reactivated_count: reactivatedCount
    });
    
  } catch (error) {
    console.error('Error in day limit expiry check:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to check day limits' 
    }, { status: 500 });
  }
}