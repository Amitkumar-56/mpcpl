//src/app/api/schedule-price-logs/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET: Fetch all scheduled prices history with customer names and dates
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    
    let query = `
      SELECT 
        dp.*,
        s.station_name,
        pc.pcode as product_code,
        p.pname as product_name,
        c.name as customer_name,
        c.id as customer_id,
        dp.Schedule_Date,
        dp.Schedule_Time,
        dp.status,
        dp.is_applied,
        dp.applied_at,
        dp.updated_date,
        dp.created_at
      FROM deal_price dp
      LEFT JOIN filling_stations s ON dp.station_id = s.id
      LEFT JOIN product_codes pc ON dp.sub_product_id = pc.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN customers c ON dp.com_id = c.id
      WHERE dp.status IN ('scheduled', 'active', 'expired')
    `;
    
    const params = [];
    
    if (date) {
      query += ` AND dp.Schedule_Date = ?`;
      params.push(date);
    }
    
    query += ` ORDER BY dp.Schedule_Date DESC, dp.Schedule_Time DESC, c.name ASC`;
    
    const scheduledPrices = await executeQuery(query, params);
    
    return NextResponse.json({ 
      success: true, 
      data: scheduledPrices,
      count: scheduledPrices.length 
    });
  } catch (err) {
    console.error('Error fetching schedule price logs:', err);
    return NextResponse.json({ 
      success: false, 
      message: err.message,
      data: [] 
    }, { status: 500 });
  }
}

