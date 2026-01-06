//src/app/api/schedule-price-logs/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET: Fetch all scheduled prices history with customer names and dates
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const customerIds = url.searchParams.get('customer_ids');
    const stationId = url.searchParams.get('station_id');
    const productId = url.searchParams.get('product_id');
    const subProductId = url.searchParams.get('sub_product_id');
    
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

    if (customerIds && customerIds.trim() !== '') {
      try {
        const ids = customerIds
          .split(',')
          .map((id) => {
            const parsed = parseInt(id.trim());
            return isNaN(parsed) ? null : parsed;
          })
          .filter(id => id !== null && id > 0);
        
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          query += ` AND dp.com_id IN (${placeholders})`;
          params.push(...ids);
        }
      } catch (parseError) {
        console.error('Error parsing customer IDs:', parseError);
        // Continue without customer filter if parsing fails
      }
    }

    if (stationId) {
      const stationIdNum = parseInt(stationId);
      if (!isNaN(stationIdNum) && stationIdNum > 0) {
        query += ` AND dp.station_id = ?`;
        params.push(stationIdNum);
      }
    }

    if (productId) {
      const productIdNum = parseInt(productId);
      if (!isNaN(productIdNum) && productIdNum > 0) {
        query += ` AND dp.product_id = ?`;
        params.push(productIdNum);
      }
    }

    if (subProductId) {
      const subProductIdNum = parseInt(subProductId);
      if (!isNaN(subProductIdNum) && subProductIdNum > 0) {
        query += ` AND dp.sub_product_id = ?`;
        params.push(subProductIdNum);
      }
    }
    
    query += ` ORDER BY dp.Schedule_Date DESC, dp.Schedule_Time DESC, c.name ASC`;
    
    const scheduledPrices = await executeQuery(query, params);
    
    return NextResponse.json({ 
      success: true, 
      data: scheduledPrices || [],
      count: scheduledPrices ? scheduledPrices.length : 0
    });
  } catch (err) {
    console.error('Error fetching schedule price logs:', err);
    console.error('Error stack:', err.stack);
    return NextResponse.json({ 
      success: false, 
      message: err.message || 'Internal server error',
      data: [],
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

