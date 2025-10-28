// app/api/cron/reset-expired-limits/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    
    // Find expired limits where expiry date is passed
    const expiredLimits = await executeQuery(
      "SELECT com_id, cst_limit, amtlimit FROM customer_balances WHERE limit_expiry IS NOT NULL AND limit_expiry < ?",
      [now]
    );

    console.log(`🕒 Found ${expiredLimits.length} expired limits to reset`);

    let resetCount = 0;
    
    for (const limit of expiredLimits) {
      // Reset limits to 0 and clear expiry
      await executeQuery(
        "UPDATE customer_balances SET cst_limit = 0, amtlimit = 0, limit_expiry = NULL, validity_days = 0 WHERE com_id = ?",
        [limit.com_id]
      );
      
      // Add to history
      await executeQuery(
        `INSERT INTO filling_history 
         (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, limit_type)
         VALUES (?, ?, ?, ?, ?, 0, ?, 'expired_auto_reset')`,
        ["credit_limit_expiry", now, 0, now, limit.com_id, now]
      );
      
      resetCount++;
      console.log(`✅ Reset expired limit for customer: ${limit.com_id}`);
    }

    return NextResponse.json({
      success: true,
      message: `Reset ${resetCount} expired credit limits`,
      resetCount
    });

  } catch (err) {
    console.error("Cron job error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}