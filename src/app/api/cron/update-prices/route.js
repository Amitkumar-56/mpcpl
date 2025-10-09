//src/app/api/cron/update-prices/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    
    console.log(`Running price update cron job at ${now}`);
    
    // Activate scheduled prices whose time has come
    const activateResult = await executeQuery(`
      UPDATE deal_price 
      SET status = 'active', is_applied = 1, applied_at = ?
      WHERE Schedule_Date = ? AND Schedule_Time <= ? 
      AND status = 'scheduled' AND is_applied = 0
      AND is_active = 1
    `, [now, currentDate, currentTime]);
    
    // Expire old prices
    const expireResult = await executeQuery(`
      UPDATE deal_price 
      SET status = 'expired'
      WHERE Schedule_Date < ? 
      AND status = 'active' 
      AND is_active = 1
    `, [currentDate]);

    console.log(`Cron job completed: ${activateResult.affectedRows} activated, ${expireResult.affectedRows} expired`);
    
    return NextResponse.json({
      success: true,
      activated: activateResult.affectedRows,
      expired: expireResult.affectedRows,
      message: `Cron job completed: ${activateResult.affectedRows} activated, ${expireResult.affectedRows} expired`
    });
  } catch (err) {
    console.error('Cron job error:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}