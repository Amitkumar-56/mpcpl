import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { customerId } = await request.json();
    
    // Check eligibility based on overdue invoices and day limits
    const eligibility = await checkCustomerEligibility(customerId);
    
    return NextResponse.json(eligibility);
  } catch (error) {
    console.error("Error checking eligibility:", error);
    return NextResponse.json({ error: "Failed to check eligibility" }, { status: 500 });
  }
}

async function checkCustomerEligibility(customerId) {
  try {
    // Check customer balance and active status
    const customerInfo = await executeQuery(`
      SELECT 
        cb.is_active,
        cb.day_limit,
        c.client_type
      FROM customer_balances cb
      INNER JOIN customers c ON cb.com_id = c.id
      WHERE cb.com_id = ?
    `, [customerId]);
    
    if (customerInfo.length === 0) {
      return {
        isEligible: false,
        reason: "Customer not found",
        isActive: false
      };
    }
    
    const isActive = customerInfo[0].is_active === 1;
    const dayLimit = parseInt(customerInfo[0].day_limit) || 0;
    const clientType = customerInfo[0].client_type;
    
    // Check if customer is inactive
    if (!isActive) {
      // Check if it's due to day limit expiry
      if (dayLimit > 0 && clientType === "3") {
        // Get oldest unpaid transaction
        const oldestUnpaid = await executeQuery(`
          SELECT completed_date 
          FROM filling_requests 
          WHERE cid = ? AND status = 'Completed' AND payment_status = 0
          ORDER BY completed_date ASC 
          LIMIT 1
        `, [customerId]);
        
        if (oldestUnpaid.length > 0) {
          const oldestUnpaidDate = new Date(oldestUnpaid[0].completed_date);
          oldestUnpaidDate.setHours(0, 0, 0, 0);
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
          const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
          
          if (daysElapsed >= dayLimit) {
            return {
              isEligible: false,
              reason: `Day limit exceeded. Your day limit has been exceeded (${daysElapsed} days elapsed, limit: ${dayLimit} days). Please recharge your account to continue.`,
              isActive: false,
              isDayLimitExpired: true,
              daysElapsed,
              dayLimit
            };
          }
        }
      }
      
      return {
        isEligible: false,
        reason: "Your account is inactive. Please contact administrator.",
        isActive: false
      };
    }
    
    // Customer is active
    return {
      isEligible: true,
      reason: "Eligible",
      isActive: true,
      dayLimit,
      clientType
    };
    
  } catch (error) {
    console.error("Error checking customer eligibility:", error);
    return {
      isEligible: false,
      reason: "Error checking eligibility: " + error.message,
      isActive: false
    };
  }
}