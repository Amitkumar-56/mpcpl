// src/app/api/cron/apply-scheduled-prices/route.js
// This endpoint should be called by a cron job at midnight (12:00 AM) daily
// You can set up a cron job or use a service like Vercel Cron, or call this from a scheduled task

import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Optional: Add authentication/authorization check here
    // For example, check for a secret token in headers
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    
    console.log(`🕐 [CRON] Running scheduled price update at ${currentDate} ${currentTime}`);
    
    // Activate scheduled prices whose time has come (at midnight 12:00 AM)
    const activated = await executeQuery(`
      UPDATE deal_price 
      SET status = 'active', is_applied = 1, applied_at = ?, updated_date = CURDATE()
      WHERE Schedule_Date = ? 
      AND (Schedule_Time = '00:00:00' OR Schedule_Time <= ?)
      AND status = 'scheduled' 
      AND is_applied = 0
      AND is_active = 1
    `, [now, currentDate, currentTime]);
    
    console.log(`✅ [CRON] Activated ${activated.affectedRows} scheduled prices`);
    
    // Deactivate old active prices for the same station/product/customer combination
    const deactivated = await executeQuery(`
      UPDATE deal_price dp1
      INNER JOIN deal_price dp2 ON 
        dp1.com_id = dp2.com_id 
        AND dp1.station_id = dp2.station_id 
        AND dp1.product_id = dp2.product_id 
        AND dp1.sub_product_id = dp2.sub_product_id
      SET dp1.status = 'expired', dp1.is_active = 0
      WHERE dp2.status = 'active' 
        AND dp2.is_applied = 1
        AND dp2.Schedule_Date = ?
        AND dp1.id != dp2.id
        AND dp1.status = 'active'
        AND dp1.is_active = 1
    `, [currentDate]);
    
    console.log(`🔄 [CRON] Deactivated ${deactivated.affectedRows} old active prices`);
    
    // Expire old prices (previous day prices)
    const expired = await executeQuery(`
      UPDATE deal_price 
      SET status = 'expired', is_active = 0
      WHERE Schedule_Date < ? 
      AND status IN ('active', 'scheduled')
      AND is_active = 1
    `, [currentDate]);
    
    console.log(`⏰ [CRON] Expired ${expired.affectedRows} old prices`);

    return NextResponse.json({ 
      success: true, 
      activated: activated.affectedRows,
      deactivated: deactivated.affectedRows,
      expired: expired.affectedRows,
      timestamp: now.toISOString(),
      message: `Scheduled prices updated: ${activated.affectedRows} activated, ${deactivated.affectedRows} deactivated, ${expired.affectedRows} expired` 
    });
  } catch (err) {
    console.error('❌ [CRON] Error in scheduled price update:', err);
    return NextResponse.json({ 
      success: false, 
      message: err.message,
      error: err.toString()
    }, { status: 500 });
  }
}

// Allow POST method as well for manual triggers
export async function POST(request) {
  return GET(request);
}

