import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json();
    const { priceUpdates } = body;

    if (!priceUpdates || !priceUpdates.length) {
      return NextResponse.json({ success: false, message: "No price updates provided" }, { status: 400 });
    }

    // Get user info for audit log
    let userId = null;
    let userName = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const userResult = await executeQuery(
            'SELECT name FROM employee_profile WHERE id = ?',
            [userId]
          );
          if (userResult.length > 0) {
            userName = userResult[0].name || 'Unknown';
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user for audit log:', authError);
    }

    // Get customer ID from first update
    const customerId = priceUpdates[0]?.data?.com_id;

    let inserted = 0;
    let updated = 0;

    for (const update of priceUpdates) {
      const { type, data } = update;
      const { com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time } = data;

      if (!com_id || !station_id || !product_id || !sub_product_id || price === undefined) continue;

      if (type === "INSERT") {
        await executeQuery(
          `INSERT INTO deal_price 
           (com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time, updated_date, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,
          [com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time]
        );
        inserted++;
      } else if (type === "UPDATE") {
        const result = await executeQuery(
          `UPDATE deal_price 
           SET price=?, Schedule_Date=?, Schedule_Time=?, updated_date=NOW()
           WHERE com_id=? AND station_id=? AND product_id=? AND sub_product_id=?`,
          [price, Schedule_Date, Schedule_Time, com_id, station_id, product_id, sub_product_id]
        );
        if (result.affectedRows > 0) updated++;
      }
    }

    // Create audit log entry for deal-price update
    if (customerId) {
      try {
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS customer_audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            user_id INT,
            user_name VARCHAR(255),
            remarks TEXT,
            amount DECIMAL(10,2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_customer_id (customer_id),
            INDEX idx_created_at (created_at)
          )
        `);
        
        await executeQuery(
          `INSERT INTO customer_audit_log (customer_id, action_type, user_id, user_name, remarks) VALUES (?, ?, ?, ?, ?)`,
          [customerId, 'deal-price', userId, userName, `Deal price updated: ${inserted} inserted, ${updated} updated`]
        );
      } catch (auditError) {
        console.error('Error creating audit log for deal-price:', auditError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed successfully: ${inserted} inserted, ${updated} updated`,
      counts: { inserted, updated },
    });
  } catch (error) {
    console.error("Error saving deal prices:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ✅ GET - Fetch existing prices
export async function GET(req) {
  try {
    const customerId = req.nextUrl.searchParams.get("customer_id");
    if (!customerId) return NextResponse.json([]);

    const data = await executeQuery(
      `SELECT dp.*, 
              p.pname AS product_name, 
              pc.pcode AS sub_product_code, 
              s.station_name
       FROM deal_price dp
       LEFT JOIN product_codes pc ON dp.sub_product_id = pc.id
       LEFT JOIN products p ON dp.product_id = p.id
       LEFT JOIN filling_stations s ON dp.station_id = s.id
       WHERE dp.com_id = ? AND dp.is_active = 1`,
      [customerId]
    );

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json([], { status: 500 });
  }
}
