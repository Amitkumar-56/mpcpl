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
  const today = new Date().toISOString().split('T')[0];
  
  // Check overdue invoices
  const overdueInvoices = await executeQuery(`
    SELECT COUNT(*) as overdue_count, SUM(pending_amount) as total_overdue
    FROM customer_invoices 
    WHERE customer_id = ? AND due_date < ? AND pending_amount > 0
  `, [customerId, today]);
  
  // Check day limit
  const dayLimitInfo = await executeQuery(`
    SELECT ce.day_limit, ce.daily_usage, ce.last_reset_date
    FROM customer_eligibility ce
    WHERE ce.customer_id = ?
  `, [customerId]);
  
  // Reset daily usage if it's a new day
  if (dayLimitInfo.length > 0 && dayLimitInfo[0].last_reset_date !== today) {
    await executeQuery(`
      UPDATE customer_eligibility 
      SET daily_usage = 0, last_reset_date = ?, next_reset_date = DATE_ADD(?, INTERVAL 1 DAY)
      WHERE customer_id = ?
    `, [today, today, customerId]);
  }
  
  const hasOverdueInvoices = overdueInvoices[0]?.overdue_count > 0;
  const dayLimitExceeded = dayLimitInfo[0]?.daily_usage >= dayLimitInfo[0]?.day_limit;
  
  const isEligible = !hasOverdueInvoices && !dayLimitExceeded;
  const reason = hasOverdueInvoices ? 
    "Overdue invoices pending" : 
    dayLimitExceeded ? "Daily limit exceeded" : "Eligible";
  
  // Update eligibility status
  await executeQuery(`
    INSERT INTO customer_eligibility (customer_id, is_eligible, eligibility_reason, last_reset_date)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
    is_eligible = ?, eligibility_reason = ?, last_reset_date = ?
  `, [customerId, isEligible, reason, today, isEligible, reason, today]);
  
  return {
    isEligible,
    reason,
    hasOverdueInvoices,
    dayLimitExceeded,
    totalOverdue: overdueInvoices[0]?.total_overdue || 0,
    dailyUsage: dayLimitInfo[0]?.daily_usage || 0,
    dayLimit: dayLimitInfo[0]?.day_limit || 0
  };
}