// src/app/api/cst/check-eligibility/route.js
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
      'SELECT day_limit, is_active, amtlimit, balance FROM customer_balances WHERE com_id = ?',
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
    const balance = parseFloat(customerBalanceRows[0].balance) || 0;
    
    // Calculate available balance
    const availableBalance = amtLimit - balance;
    
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
      // Count distinct completed unpaid days (case-insensitive status)
      const [{ used_days: usedDaysTotal }] = await executeQuery(
        `SELECT COUNT(DISTINCT DATE(completed_date)) AS used_days
         FROM filling_requests
         WHERE cid = ?
           AND UPPER(status) = 'COMPLETED'
           AND payment_status = 0`,
        [parseInt(customer_id)]
      ).catch(() => [{ used_days: 0 }]);

      // Check if today already has a completed unpaid transaction
      const [{ count: todayCompleted }] = await executeQuery(
        `SELECT COUNT(*) AS count
         FROM filling_requests
         WHERE cid = ?
           AND UPPER(status) = 'COMPLETED'
           AND payment_status = 0
           AND DATE(completed_date) = CURDATE()`,
        [parseInt(customer_id)]
      ).catch(() => [{ count: 0 }]);

      // Rule:
      // - Each distinct completed date counts as 1 day
      // - Unlimited requests within the same counted day
      // - If usedDaysTotal < dayLimitVal => allow
      // - If usedDaysTotal >= dayLimitVal:
      //     - allow only if today already counted (todayCompleted > 0)
      //     - otherwise block
      const withinLimit = usedDaysTotal < dayLimitVal || todayCompleted > 0;

      if (!withinLimit) {
        // Prepare message with oldest unpaid day info
        const oldestDay = await executeQuery(
          `SELECT DATE(completed_date) as day_date, 
                  SUM(totalamt) as day_total
           FROM filling_requests 
           WHERE cid = ? 
             AND UPPER(status) = 'COMPLETED' 
             AND payment_status = 0 
           GROUP BY DATE(completed_date)
           ORDER BY DATE(completed_date) ASC
           LIMIT 1`,
          [parseInt(customer_id)]
        ).catch(() => []);
        
        let reason = `Day limit reached (${usedDaysTotal}/${dayLimitVal}). Please recharge or clear overdue balance.`;
        
        if (oldestDay.length > 0) {
          const dayDate = new Date(oldestDay[0].day_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          const dayTotal = parseFloat(oldestDay[0].day_total) || 0;
          reason += `\nOldest unpaid day ${dayDate} total ₹${dayTotal.toFixed(2)}`;
        }
        
        return NextResponse.json({
          success: true,
          isEligible: false,
          reason,
          pendingDays: usedDaysTotal,
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
        console.log('💰 Available Balance Check:', {
          amtLimit,
          balance,
          availableBalance
        });
        
        // Check if available balance is sufficient (available balance should be greater than 0)
        if (availableBalance > 0) {
          // All checks passed
          return NextResponse.json({
            success: true,
            isEligible: true,
            reason: null,
            pendingDays: 0,
            dayLimit: dayLimitVal,
            creditLimit: amtLimit,
            currentBalance: balance,
            availableBalance: availableBalance
          });
        } else {
          return NextResponse.json({
            success: true,
            isEligible: false,
            reason: `Insufficient balance (Available: ₹${availableBalance.toFixed(2)}, Limit: ₹${amtLimit.toFixed(2)}, Used: ₹${balance.toFixed(2)})`,
            creditLimit: amtLimit,
            currentBalance: balance,
            availableBalance: availableBalance
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
      dayLimit: dayLimitVal,
      creditLimit: amtLimit,
      currentBalance: balance,
      availableBalance: availableBalance
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
