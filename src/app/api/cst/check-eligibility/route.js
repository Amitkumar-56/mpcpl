import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { customer_id } = await request.json();
    
    if (!customer_id) {
      return NextResponse.json({ 
        success: false, 
        isEligible: false,
        reason: 'Customer ID required' 
      }, { status: 400 });
    }
    
    // Get customer balance info
    const customerBalanceRows = await executeQuery(
      'SELECT day_limit, is_active, amtlimit FROM customer_balances WHERE com_id = ?',
      [parseInt(customer_id)]
    );
    
    if (customerBalanceRows.length === 0) {
      return NextResponse.json({
        success: false,
        isEligible: false,
        reason: 'Customer balance record not found'
      });
    }
    
    const isActive = customerBalanceRows[0].is_active === 1;
    const dayLimitVal = parseInt(customerBalanceRows[0].day_limit) || 0;
    const amtLimit = parseFloat(customerBalanceRows[0].amtlimit) || 0;
    
    // Check if customer is active
    if (!isActive) {
      return NextResponse.json({
        success: true,
        isEligible: false,
        reason: 'Your account is inactive. Please contact administrator.'
      });
    }
    
    // Day limit check
    if (dayLimitVal > 0) {
      // Get unpaid days count
      const unpaidDays = await executeQuery(
        `SELECT DATE(completed_date) as day_date
         FROM filling_requests 
         WHERE cid = ? 
           AND status = 'Completed' 
           AND payment_status = 0 
         GROUP BY DATE(completed_date)`,
        [parseInt(customer_id)]
      );
      
      if (unpaidDays.length >= dayLimitVal) {
        // Get oldest unpaid day for message
        const oldestDay = await executeQuery(
          `SELECT DATE(completed_date) as day_date, 
                  SUM(totalamt) as day_total,
                  COUNT(*) as count
           FROM filling_requests 
           WHERE cid = ? 
             AND status = 'Completed' 
             AND payment_status = 0 
           GROUP BY DATE(completed_date)
           ORDER BY DATE(completed_date) ASC
           LIMIT 1`,
          [parseInt(customer_id)]
        );
        
        let reason = `Day limit reached! You have ${unpaidDays.length} unpaid day(s) out of ${dayLimitVal} allowed.`;
        
        if (oldestDay.length > 0) {
          const dayDate = new Date(oldestDay[0].day_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          const dayTotal = parseFloat(oldestDay[0].day_total) || 0;
          reason += `\nPlease clear payment for ${dayDate} (₹${dayTotal.toFixed(2)})`;
        }
        
        return NextResponse.json({
          success: true,
          isEligible: false,
          reason: reason,
          pendingDays: unpaidDays.length,
          dayLimit: dayLimitVal,
          requiresPayment: true
        });
      }
      
      // Check if any unpaid transaction is beyond allowed days
      if (unpaidDays.length > 0) {
        const oldestTransaction = await executeQuery(
          `SELECT completed_date FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
           ORDER BY completed_date ASC LIMIT 1`,
          [parseInt(customer_id)]
        );
        
        if (oldestTransaction.length > 0 && oldestTransaction[0].completed_date) {
          const completed = new Date(oldestTransaction[0].completed_date);
          const today = new Date();
          const daysElapsed = Math.floor((today - completed) / (1000 * 60 * 60 * 24));
          
          if (daysElapsed >= dayLimitVal) {
            const formattedDate = completed.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            
            return NextResponse.json({
              success: true,
              isEligible: false,
              reason: `Day limit exceeded! Oldest unpaid transaction from ${formattedDate} is ${daysElapsed} days old (limit: ${dayLimitVal} days).`,
              pendingDays: unpaidDays.length,
              dayLimit: dayLimitVal,
              requiresPayment: true
            });
          }
        }
      }
    }
    
    // Check credit limit for non-day-limit customers
    if (dayLimitVal === 0 && amtLimit > 0) {
      // Get customer type
      const typeRows = await executeQuery(
        'SELECT client_type FROM customers WHERE id = ?',
        [parseInt(customer_id)]
      );
      const clientType = typeRows.length > 0 ? String(typeRows[0].client_type) : '';
      
      if (clientType === '2') {
        // Get current used credit
        const creditUsedRows = await executeQuery(
          `SELECT SUM(totalamt) as total_used 
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0`,
          [parseInt(customer_id)]
        );
        
        const creditUsed = parseFloat(creditUsedRows[0]?.total_used) || 0;
        const availableCredit = amtLimit - creditUsed;
        
        if (availableCredit <= 0) {
          return NextResponse.json({
            success: true,
            isEligible: false,
            reason: 'Insufficient credit limit. Please recharge to continue.',
            creditUsed: creditUsed,
            creditLimit: amtLimit,
            availableCredit: availableCredit
          });
        }
      }
    }
    
    // All checks passed
    return NextResponse.json({
      success: true,
      isEligible: true,
      reason: null,
      pendingDays: 0,
      dayLimit: dayLimitVal
    });
    
  } catch (error) {
    console.error("❌ Eligibility check error:", error);
    return NextResponse.json({ 
      success: false, 
      isEligible: false,
      reason: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}